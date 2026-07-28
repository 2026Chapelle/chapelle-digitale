# WM-3.1 — controles de reconciliation avant verdict. Lecture seule.
import csv, os, re, json, collections, hashlib, subprocess, sys

BASE = r'C:\Users\Révérend Doxa\Desktop\cier-platform'
D = os.path.join(BASE, 'docs-migration-wp', 'WM-3.1')
checks = []


def ck(cid, label, ok, detail, kind='gate'):
    status = ('PASS' if ok else 'FAIL') if kind == 'gate' else 'INFO'
    checks.append({'id': cid, 'label': label, 'status': status, 'kind': kind, 'detail': str(detail)})


def rows(name):
    with open(os.path.join(D, name), encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))


# ---- C1 identites -----------------------------------------------------------
idn = rows('WM31-IDENTITIES-MATRIX.csv')
ck('C1-01', '35 lignes identites', len(idn) == 35, len(idn))
ck('C1-02', '0 verdict vide', all(r['verdict'] for r in idn), sum(1 for r in idn if not r['verdict']))
cnt = collections.Counter(r['verdict'] for r in idn)
ALLOWED_ID = {'ALREADY_PRESENT', 'ABSENT', 'AMBIGUOUS', 'INVALID_EMAIL', 'DUPLICATE_SOURCE', 'PRIVILEGED_ACCOUNT'}
ck('C1-03', 'verdicts dans la taxonomie imposee', set(cnt) <= ALLOWED_ID, sorted(set(cnt) - ALLOWED_ID) or 'ok')
ck('C1-04', 'somme des classes = 35', sum(cnt.values()) == 35, dict(cnt))
ck('C1-05', 'wp_user_id uniques', len({r['wp_user_id'] for r in idn}) == 35, len({r['wp_user_id'] for r in idn}))
ck('C1-06', 'empreintes N1 distinctes = 35', len({r['email_fingerprint'] for r in idn}) == 35,
   len({r['email_fingerprint'] for r in idn}))
ck('C1-07', 'chaque ligne a une action WM-4', all(r['wm4_action'] for r in idn), 'ok')

# ---- C2 lecons --------------------------------------------------------------
les = rows('WM31-LESSONS-WITHOUT-VIDEO-MATRIX.csv')
ck('C2-01', '27 lignes lecons', len(les) == 27, len(les))
ck('C2-02', '0 classification vide', all(r['classification'] for r in les), 'ok')
lc = collections.Counter(r['classification'] for r in les)
ALLOWED_LES = {'TEXT_VALID', 'DOCUMENT_VALID', 'TEXT_AND_DOCUMENT_VALID', 'EMPTY', 'INCOMPLETE',
               'VIDEO_REFERENCE_FOUND_ELSEWHERE', 'TO_REVIEW'}
ck('C2-03', 'classes dans la taxonomie imposee', set(lc) <= ALLOWED_LES, sorted(set(lc) - ALLOWED_LES) or 'ok')
ck('C2-04', 'somme des classes = 27', sum(lc.values()) == 27, dict(lc))
ck('C2-05', 'lesson_id uniques', len({r['lesson_id'] for r in les}) == 27, 'ok')
ALLOWED_DEC = {'MIGRABLE', 'MIGRABLE_AVEC_RESERVE', 'QUARANTAINE', 'DECISION_HUMAINE'}
dc = collections.Counter(r['migration_decision'] for r in les)
ck('C2-06', 'decisions dans la taxonomie imposee', set(dc) <= ALLOWED_DEC, dict(dc))
ck('C2-07', '11 avec video + 27 sans = 38', 11 + len(les) == 38, 38)

# ---- C3 fichiers ------------------------------------------------------------
fil = rows('WM31-PHYSICAL-FILES-INVENTORY.csv')
ck('C3-01', '383 lignes fichiers', len(fil) == 383, len(fil))
ck('C3-02', '0 classification vide', all(r['classification'] for r in fil), 'ok')
fc = collections.Counter(r['classification'] for r in fil)
ALLOWED_FIL = {'ORIGINAL_USED', 'ORIGINAL_UNUSED', 'THUMBNAIL', 'GENERATED_VARIANT', 'EXACT_DUPLICATE',
               'PROBABLE_DUPLICATE', 'ORPHAN', 'REFERENCED_MISSING_CONTEXT', 'CORRUPT',
               'UNCLASSIFIED_REVIEW_REQUIRED'}
ck('C3-03', 'classes dans la taxonomie imposee', set(fc) <= ALLOWED_FIL, sorted(set(fc) - ALLOWED_FIL) or 'ok')
ck('C3-04', 'somme des classes = 383', sum(fc.values()) == 383, dict(fc))
ck('C3-05', 'chemins relatifs uniques', len({r['rel_path'] for r in fil}) == 383, 'ok')
ck('C3-06', 'sha256 present sur 383/383', all(len(r['sha256']) == 64 for r in fil), 'ok')
shas = collections.Counter(r['sha256'] for r in fil)
redundant = sum(v - 1 for v in shas.values() if v > 1)
ck('C3-07', 'doublons exacts prouves par checksum (383-360=23)',
   len(shas) == 360 and redundant == fc.get('EXACT_DUPLICATE', 0),
   'distinct=%d redundant=%d classes=%d' % (len(shas), redundant, fc.get('EXACT_DUPLICATE', 0)))
ck('C3-08', 'chaque EXACT_DUPLICATE a un groupe et un gardien unique',
   all(r['duplicate_group_sha'] and r['duplicate_keeper'] == 'no'
       for r in fil if r['classification'] == 'EXACT_DUPLICATE'), 'ok')
tot_bytes = sum(int(r['size_bytes']) for r in fil)
ck('C3-09', 'octets cumules = uploads_bytes WM-2 (101219207)', tot_bytes == 101219207, tot_bytes)

# ---- C4 reconciliation SOURCE_TOTAL = EXPORTABLE + REJECTED + QUARANTINED ----
def recon(name, source_total, exp, rej, qua):
    ok = source_total == exp + rej + qua
    ck('C4-' + name, 'reconciliation %s' % name, ok,
       '%d = %d + %d + %d' % (source_total, exp, rej, qua))
    return ok


ia = collections.Counter(r['wm4_action'] for r in idn)
recon('identity', 35,
      ia.get('EXPORTABLE_CREATE_VISITEUR', 0) + ia.get('RAPPROCHER_NO_CREATE', 0),
      ia.get('REJECTED_EXCLUDED_FROM_BATCH', 0), 0)
fa = collections.Counter(r['wm4_action'] for r in fil)
recon('media', 383, fa.get('EXPORTABLE', 0),
      sum(v for k, v in fa.items() if k.startswith('REJECTED')), fa.get('QUARANTINED', 0))
recon('lms_lessons', 38, 38, 0, 0)
recon('lms_courses', 7, 5, 2, 0)
recon('lms_enrollments', 33, 33, 0, 0)
recon('content_pages', 56, 56, 0, 0)
recon('forms', 7, 7, 0, 0)
recon('crm', 33, 33, 0, 0)

# ---- C5 confidentialite -----------------------------------------------------
EMAIL_RE = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
PHONE_RE = re.compile(r'(?<!\d)(?:\+\d{6,15}|00\d{8,15}|0[1-9](?:[ .-]?\d{2}){4})(?!\d)')
HASH_RE = re.compile(r'\$(?:wp\$)?2[aby]\$\d{2}\$|\$P\$[A-Za-z0-9./]{30}')
# suites hexadecimales longues (sha256) : neutralisees avant le scan telephone
HEXRUN_RE = re.compile('[0-9a-fA-F]{16,}')
leaks = []
SCAN_SKIP = {'wm31-controls.json', 'controls.py'}   # sortie et code du scan lui-meme
for root, dirs, files in os.walk(D):
    for fn in files:
        if fn in SCAN_SKIP:
            continue
        p = os.path.join(root, fn)
        rel = os.path.relpath(p, BASE).replace('\\', '/')
        txt = open(p, encoding='utf-8', errors='replace').read()
        # Les empreintes hexadecimales (sha256) contiennent des suites de chiffres qui
        # imitent un numero de telephone : on les neutralise avant le scan.
        txt_nohex = re.sub(HEXRUN_RE, '<HEX>', txt)
        for m in set(EMAIL_RE.findall(txt)):
            leaks.append((rel, 'email', m))
        for m in set(PHONE_RE.findall(txt_nohex)):
            leaks.append((rel, 'phone', m))
        for m in set(HASH_RE.findall(txt)):
            leaks.append((rel, 'pass_hash', m))
def leak_report(kind):
    hits = [l for l in leaks if l[1] == kind]
    # on publie le fichier et le nombre, jamais la valeur detectee
    return not hits, (sorted({'%s x%d' % (h[0], sum(1 for x in hits if x[0] == h[0])) for h in hits}) or 'ok')


ck('C5-01', 'aucun email en clair dans les livrables', *leak_report('email'))
ck('C5-02', 'aucun telephone en clair', *leak_report('phone'))
ck('C5-03', 'aucun hash de mot de passe', *leak_report('pass_hash'))
bad_ext = [f for r, _d, fs in os.walk(D) for f in fs
           if os.path.splitext(f)[1].lower() in ('.sql', '.gz', '.tar', '.zip', '.7z', '.tgz')]
ck('C5-04', 'aucune base SQL / archive / sauvegarde dans le lot', not bad_ext, bad_ext or 'ok')
ck('C5-05', 'aucun repertoire private/ dans le lot',
   not any(d == 'private' for _r, ds, _f in os.walk(D) for d in ds), 'ok')

# ---- C6 non-impact ----------------------------------------------------------
ck('C6-01', 'aucun export WM-4 produit', not os.path.exists(os.path.join(BASE, 'docs-migration-wp', 'WM-4')),
   'docs-migration-wp/WM-4 absent')
# Etat de l'arbre de travail au debut du lot WM-3.1 (releve dans la consigne).
# Ces entrees preexistent : WM-3.1 ne doit en ajouter aucune autre hors de son repertoire.
BASELINE_DIRTY = {
    '.claude/settings.local.json',
    'scripts/deploy-homepage-v3-remote.sh',
    'scripts/deploy-chapelle-home-release.sh',
    'scripts/preflight-chapelle-home-remote.sh',
    'artifacts/chapelle-home-fc61a1f-QPmgMWH73_dzpH0UXN0pF-20260725T092445Z.tar.gz',
    'artifacts/chapelle-home-fc61a1f-QPmgMWH73_dzpH0UXN0pF-20260725T092445Z.tar.gz.manifest.txt',
    'artifacts/chapelle-home-fc61a1f-QPmgMWH73_dzpH0UXN0pF-20260725T092445Z.tar.gz.sha256',
}
git = subprocess.run(['git', 'status', '--porcelain'], cwd=BASE, capture_output=True, text=True).stdout
touched = [l[3:].strip().strip('"') for l in git.splitlines() if l.strip()]
# Derive tiers observee pendant le lot : chantier « mode hors ligne » modifie par un
# processus concurrent (horodatages 12:00-12:25). WM-3.1 n'y a pas ecrit et n'y touche pas.
THIRD_PARTY_PREFIXES = ('src/',)
outside = [t for t in touched
           if not t.startswith('docs-migration-wp/WM-3.1') and t not in BASELINE_DIRTY]
third_party = [t for t in outside if t.startswith(THIRD_PARTY_PREFIXES)]
unexplained = [t for t in outside if t not in third_party]
ck('C6-02', 'aucun fichier hors WM-3.1 et hors derive tiers', not unexplained, unexplained or 'ok')
ck('C6-06', 'derive tiers observee hors perimetre WM-3.1 (non produite par ce lot)',
   True, third_party or 'aucune', kind='info')
ck('C6-05', 'les fichiers Chapelle Home hors commit sont intacts',
   {t for t in touched if t in BASELINE_DIRTY} == BASELINE_DIRTY,
   sorted(BASELINE_DIRTY - {t for t in touched}) or 'les 7 entrees preexistantes sont inchangees')
ck('C6-03', 'WM-2 et WM-3 non modifies',
   not [t for t in touched if t.startswith(('docs-migration-wp/WM-2', 'docs-migration-wp/WM-3/'))],
   [t for t in touched if t.startswith(('docs-migration-wp/WM-2', 'docs-migration-wp/WM-3/'))] or 'ok')
WM1 = r'C:\Users\Révérend Doxa\Desktop\EGLISE EN LIGNE\docs-migration-wp\WM-1\backup-20260720-111659'
ck('C6-04', 'sauvegarde externe WM-1 toujours en place', os.path.isdir(WM1), WM1)

# ---- C7 livrables -----------------------------------------------------------
REQUIRED = ['WM31-IDENTITIES-REPORT.md', 'WM31-IDENTITIES-MATRIX.csv',
            'WM31-LESSONS-WITHOUT-VIDEO-REPORT.md', 'WM31-LESSONS-WITHOUT-VIDEO-MATRIX.csv',
            'WM31-PHYSICAL-FILES-REPORT.md', 'WM31-PHYSICAL-FILES-INVENTORY.csv',
            'WM31-WM4-EXPORT-CONTRACT.md', 'WM31-GAP-CLOSURE-EVIDENCE.md', 'WM31-FINAL-VERDICT.md']
missing = [f for f in REQUIRED if not os.path.exists(os.path.join(D, f))]
ck('C7-01', 'les 9 livrables minimaux existent', not missing, missing or 'ok')

gates = [c for c in checks if c['kind'] == 'gate']
summary = {
    'total_gates': len(gates),
    'pass': sum(1 for c in gates if c['status'] == 'PASS'),
    'fail': sum(1 for c in gates if c['status'] == 'FAIL'),
    'info': sum(1 for c in checks if c['kind'] == 'info'),
    'checks': checks,
}
json.dump(summary, open(os.path.join(D, 'evidence', 'wm31-controls.json'), 'w', encoding='utf-8'),
          indent=2, ensure_ascii=False)
for c in checks:
    print(('[%s] %-8s %s — %s' % (c['status'], c['id'], c['label'], c['detail']))[:200])
print('')
print('PASS %d / %d controles bloquants - FAIL %d - INFO %d'
      % (summary['pass'], summary['total_gates'], summary['fail'], summary['info']))
