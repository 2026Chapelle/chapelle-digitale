# WM-3.1 — manifeste + checksums des livrables.
import os, json, hashlib, csv, subprocess

BASE = r'C:\Users\Révérend Doxa\Desktop\cier-platform'
D = os.path.join(BASE, 'docs-migration-wp', 'WM-3.1')
MAN = os.path.join(D, 'manifests')
SUMS = os.path.join(MAN, 'SHA256SUMS.txt')
MANIFEST = os.path.join(MAN, 'WM31-MANIFEST.json')
STAMP = os.environ['WM31_STAMP']

for f in (SUMS, MANIFEST):
    if os.path.exists(f):
        os.remove(f)

files = []
for root, _dirs, names in os.walk(D):
    for n in sorted(names):
        p = os.path.join(root, n)
        rel = os.path.relpath(p, D).replace('\\', '/')
        data = open(p, 'rb').read()
        files.append({
            'path': rel,
            'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest(),
            'lines': data.count(b'\n') + (0 if data.endswith(b'\n') or not data else 1),
        })
files.sort(key=lambda x: x['path'])

with open(SUMS, 'w', encoding='utf-8', newline='\n') as f:
    for x in files:
        f.write('%s  %s\n' % (x['sha256'], x['path']))

ctrl = json.load(open(os.path.join(D, 'evidence', 'wm31-controls.json'), encoding='utf-8'))
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=BASE, capture_output=True, text=True).stdout.strip()
branch = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=BASE,
                        capture_output=True, text=True).stdout.strip()

manifest = {
    'lot': 'WM-3.1',
    'title': 'Fermeture des quatre gaps de WM-3',
    'created_utc': STAMP,
    'branch': branch,
    'baseline_commit': head,
    'upstream': {
        'wm1_pointer': 'docs-migration-wp/WM-1-EXTERNAL-SOURCE.md',
        'wm1_backup': 'backup-20260720-111659 (externe, lecture seule)',
        'wm1_sha256': {
            'database/chapelle-premium-db.sql':
                'acc657fe827a7f5109f6008b68ea92d2d869199aba873392f2a2e2b2a3860dfc',
            'database/chapelle-premium-db.sql.gz':
                '42c87d03416914d6b9266c2ef2925b2d6d8a1376fb3e9420560f48c3269081bc',
            'files/public_html-files.tar.gz':
                'd64c5642d43a3b191e2bd52095ba023755ac07957b0e91558c6097a3f01f4507',
        },
        'wm2_audit': 'audit-20260720-231559',
        'wm3_mapping': 'mapping-20260720',
    },
    'gaps': {
        'G1': {'objet': '35 identites par empreinte normalisee', 'etat': 'FERME',
               'classes': {'ALREADY_PRESENT': 4, 'ABSENT': 30, 'AMBIGUOUS': 0,
                           'INVALID_EMAIL': 0, 'DUPLICATE_SOURCE': 0, 'PRIVILEGED_ACCOUNT': 1},
               'total': 35},
        'G2': {'objet': '27 lecons sans video qualifiees individuellement', 'etat': 'FERME',
               'classes': {'TEXT_VALID': 8, 'DOCUMENT_VALID': 0, 'TEXT_AND_DOCUMENT_VALID': 0,
                           'EMPTY': 0, 'INCOMPLETE': 19, 'VIDEO_REFERENCE_FOUND_ELSEWHERE': 0,
                           'TO_REVIEW': 0},
               'decisions': {'MIGRABLE': 8, 'MIGRABLE_AVEC_RESERVE': 19, 'QUARANTAINE': 0,
                             'DECISION_HUMAINE': 19},
               'total': 27},
        'G3': {'objet': '383 fichiers physiques classes', 'etat': 'FERME',
               'classes': {'ORIGINAL_USED': 60, 'ORIGINAL_UNUSED': 9, 'THUMBNAIL': 281,
                           'GENERATED_VARIANT': 8, 'EXACT_DUPLICATE': 23, 'PROBABLE_DUPLICATE': 0,
                           'ORPHAN': 1, 'REFERENCED_MISSING_CONTEXT': 0, 'CORRUPT': 1,
                           'UNCLASSIFIED_REVIEW_REQUIRED': 0},
               'total': 383, 'bytes': 101219207, 'distinct_checksums': 360},
        'G4': {'objet': 'contrat technique WM-4', 'etat': 'FERME',
               'elements_couverts': 18, 'elements_exiges': 18},
    },
    'reconciliation': {
        'formule': 'SOURCE_TOTAL = EXPORTABLE + REJECTED + QUARANTINED',
        'domaines': {
            'identity': {'source_total': 35, 'exportable': 34, 'rejected': 1, 'quarantined': 0, 'delta': 0},
            'lms_courses': {'source_total': 7, 'exportable': 5, 'rejected': 2, 'quarantined': 0, 'delta': 0},
            'lms_lessons': {'source_total': 38, 'exportable': 38, 'rejected': 0, 'quarantined': 0, 'delta': 0},
            'lms_enrollments': {'source_total': 33, 'exportable': 33, 'rejected': 0, 'quarantined': 0, 'delta': 0},
            'media': {'source_total': 383, 'exportable': 69, 'rejected': 313, 'quarantined': 1, 'delta': 0},
            'content_pages': {'source_total': 56, 'exportable': 56, 'rejected': 0, 'quarantined': 0, 'delta': 0},
            'forms': {'source_total': 7, 'exportable': 7, 'rejected': 0, 'quarantined': 0, 'delta': 0},
            'crm': {'source_total': 33, 'exportable': 33, 'rejected': 0, 'quarantined': 0, 'delta': 0},
        },
    },
    'controls': {'gates': ctrl['total_gates'], 'pass': ctrl['pass'], 'fail': ctrl['fail'],
                 'info': ctrl['info']},
    'reserves': [
        {'id': 'R1', 'controle': 'PRE-ID-03', 'bloquant': True,
         'objet': 'doublons canoniques cote Citadelle : 13 profiles pour 5 empreintes'},
        {'id': 'R2', 'controle': 'PRE-MED-04', 'bloquant': True,
         'objet': '5 references media (34548 34549 34553 34555 34577) sans objet en base ni sur disque'},
        {'id': 'R3', 'controle': 'PRE-LMS-05', 'bloquant': False,
         'objet': '19 lecons porteuses d un marqueur de redaction inachevee'},
    ],
    'non_impact': {
        'wordpress_writes': 0, 'supabase_writes': 0, 'citadelle_writes': 0,
        'supabase_reads': 2, 'wm4_exports_produced': 0,
        'wm1_backup_modified': False, 'git_commit': False, 'git_push': False,
        'app_code_modified_by_this_lot': False, 'homepage_modified': False,
    },
    'verdict': 'WM31_OK_WITH_RESERVATIONS',
    'approval_marker_emitted': False,
    'approval_marker': 'CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK',
    'files': files,
    'files_count': len(files),
    'files_bytes': sum(x['bytes'] for x in files),
    'note_manifest': 'WM31-MANIFEST.json et SHA256SUMS.txt sont exclus de leur propre somme',
}
json.dump(manifest, open(MANIFEST, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('files inventoried: %d  bytes: %d' % (len(files), manifest['files_bytes']))
print('SHA256SUMS.txt lines:', len(files))
