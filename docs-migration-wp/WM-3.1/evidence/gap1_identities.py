# GAP 1 — 35 identites WordPress vs Citadelle. Read-only. Emits pseudonymised CSV.
import json, hashlib, re, sys, unicodedata, csv, collections

S = sys.argv[1]
dump = json.load(open(S + '/dump.json', encoding='utf-8'))
cit = json.load(open(S + '/citadelle.json', encoding='utf-8'))

USERS_COLS = ['ID', 'user_login', 'user_pass', 'user_nicename', 'user_email', 'user_url',
              'user_registered', 'user_activation_key', 'user_status', 'display_name']

users = [dict(zip(USERS_COLS, r)) for r in dump['wp_users']]
assert len(users) == 35, len(users)

# usermeta: umeta_id, user_id, meta_key, meta_value
meta = collections.defaultdict(dict)
for r in dump['wp_usermeta']:
    meta[str(r[1])][r[2]] = r[3]

EMAIL_RE = re.compile(r"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$")
PROVIDER_DOT_INSENSITIVE = {'gmail.com', 'googlemail.com'}
PROVIDER_ALIAS = {'googlemail.com': 'gmail.com'}


def norm(email):
    """Niveau 1 : normalisation stricte (trim + NFKC + lowercase)."""
    if email is None:
        return ''
    e = unicodedata.normalize('NFKC', email).strip().strip('<>').lower()
    return e


def canon(email_norm):
    """Niveau 2 : empreinte canonique (plus-tag retire, points gmail retires, alias domaine)."""
    if email_norm.count('@') != 1:
        return email_norm
    local, dom = email_norm.split('@')
    dom = PROVIDER_ALIAS.get(dom, dom)
    if '+' in local:
        local = local.split('+', 1)[0]
    if dom in PROVIDER_DOT_INSENSITIVE or dom in PROVIDER_ALIAS.values():
        local = local.replace('.', '')
    return local + '@' + dom


def fp(value):
    return hashlib.sha256(('WM31|' + value).encode('utf-8')).hexdigest()[:16]


def valid(email_norm):
    if not email_norm or email_norm.count('@') != 1:
        return False, 'no_single_at'
    if len(email_norm) > 254:
        return False, 'too_long'
    if not EMAIL_RE.match(email_norm):
        return False, 'regex_fail'
    local, dom = email_norm.split('@')
    if not local or local.startswith('.') or local.endswith('.') or '..' in local:
        return False, 'local_part_dots'
    if '.' not in dom or dom.startswith('-') or dom.endswith('-'):
        return False, 'domain_shape'
    return True, 'ok'


def is_privileged(caps, level):
    if caps and ('"administrator"' in caps or 's:13:"administrator"' in caps):
        return True, 'administrator'
    if level and level.isdigit() and int(level) >= 8:
        return True, 'user_level>=8'
    if caps and 'tutor_instructor' in caps:
        return True, 'tutor_instructor'
    return False, ''


# ---- Citadelle side ----------------------------------------------------------
cit_profiles = cit['profiles'] or []
cit_auth = cit['auth_users'] or []

cit_index_norm = collections.defaultdict(list)   # norm -> list of ('profiles'|'auth', id)
cit_index_canon = collections.defaultdict(list)
for p in cit_profiles:
    n = norm(p.get('email'))
    if n:
        cit_index_norm[n].append(('profiles', p['id']))
        cit_index_canon[canon(n)].append(('profiles', p['id']))
for a in cit_auth:
    n = norm(a.get('email'))
    if n:
        cit_index_norm[n].append(('auth', a['id']))
        cit_index_canon[canon(n)].append(('auth', a['id']))

# ---- Source-side duplicate detection ----------------------------------------
by_norm = collections.defaultdict(list)
by_canon = collections.defaultdict(list)
by_login = collections.defaultdict(list)
for u in users:
    n = norm(u['user_email'])
    by_norm[n].append(u['ID'])
    by_canon[canon(n)].append(u['ID'])
    by_login[norm(u['user_login'])].append(u['ID'])

rows = []
for u in sorted(users, key=lambda x: int(x['ID'])):
    uid = str(u['ID'])
    n = norm(u['user_email'])
    c = canon(n)
    ok, why = valid(n)
    caps = meta[uid].get('wp_capabilities', '')
    lvl = meta[uid].get('wp_user_level', '')
    priv, priv_why = is_privileged(caps, lvl)
    dom = n.split('@')[1] if '@' in n else ''

    cit_hits_norm = cit_index_norm.get(n, [])
    cit_hits_canon = cit_index_canon.get(c, [])
    cit_profile_ids = sorted({i for k, i in cit_hits_canon if k == 'profiles'})
    cit_auth_ids = sorted({i for k, i in cit_hits_canon if k == 'auth'})
    match_level = 'none'
    if cit_hits_norm:
        match_level = 'strict_norm'
    elif cit_hits_canon:
        match_level = 'canonical_only'

    dup_norm = len(by_norm[n]) > 1
    dup_canon = len(by_canon[c]) > 1
    dup_login = len(by_login[norm(u['user_login'])]) > 1

    # --- verdict (precedence order, mutually exclusive) ---
    reasons = []
    if not ok:
        verdict = 'INVALID_EMAIL'
        reasons.append('validation=' + why)
    elif priv:
        verdict = 'PRIVILEGED_ACCOUNT'
        reasons.append('privilege=' + priv_why)
    elif dup_norm or dup_canon or dup_login:
        verdict = 'DUPLICATE_SOURCE'
        reasons.append('dup_norm' if dup_norm else ('dup_canon' if dup_canon else 'dup_login'))
    elif len({i for _, i in cit_hits_canon}) > 1 and not cit_hits_norm:
        verdict = 'AMBIGUOUS'
        reasons.append('multi_target_canonical')
    elif cit_hits_canon and not cit_hits_norm:
        verdict = 'AMBIGUOUS'
        reasons.append('canonical_only_match')
    elif cit_hits_norm:
        strict_prof = {i for k, i in cit_hits_norm if k == 'profiles'}
        strict_auth = {i for k, i in cit_hits_norm if k == 'auth'}
        if len(strict_prof) > 1 or len(strict_auth) > 1:
            verdict = 'AMBIGUOUS'
            reasons.append('multi_strict_target')
        elif strict_prof and strict_auth and strict_prof != strict_auth:
            verdict = 'AMBIGUOUS'
            reasons.append('profiles_auth_id_divergence')
        elif cit_profile_ids and not cit_auth_ids:
            verdict = 'AMBIGUOUS'
            reasons.append('profile_without_auth_user')
        elif cit_auth_ids and not cit_profile_ids:
            verdict = 'AMBIGUOUS'
            reasons.append('auth_user_without_profile')
        else:
            verdict = 'ALREADY_PRESENT'
            reasons.append('strict_email_match')
    else:
        verdict = 'ABSENT'
        reasons.append('no_match_in_citadelle')

    prof = next((p for p in cit_profiles if norm(p.get('email')) == n), None)

    rows.append({
        'wp_user_id': uid,
        'email_fingerprint': fp(n),
        'canonical_fingerprint': fp(c),
        'email_domain': dom,
        'email_valid': 'yes' if ok else 'no',
        'normalisation_applied': ('trim+nfkc+lower' + ('+plus_tag' if '+' in n.split('@')[0] else '')
                                  + ('+dot_strip' if (dom in PROVIDER_DOT_INSENSITIVE and '.' in n.split('@')[0]) else '')),
        'source_duplicate_group': 'yes' if (dup_norm or dup_canon or dup_login) else 'no',
        'wp_privileged': 'yes' if priv else 'no',
        'wp_capabilities_shape': (caps or '')[:80],
        'wp_registered': u['user_registered'],
        'citadelle_match_level': match_level,
        'citadelle_strict_profiles_hits': len({i for k, i in cit_hits_norm if k == 'profiles'}),
        'citadelle_strict_auth_hits': len({i for k, i in cit_hits_norm if k == 'auth'}),
        'citadelle_canonical_profiles_hits': len(cit_profile_ids),
        'citadelle_canonical_auth_hits': len(cit_auth_ids),
        'citadelle_target_duplicate_siblings': max(0, len(cit_profile_ids) - 1),
        'citadelle_profile_role': (prof or {}).get('role', ''),
        'citadelle_membre_statut': (prof or {}).get('membre_statut', ''),
        'verdict': verdict,
        'verdict_reason': ';'.join(reasons),
        'wm4_action': {
            'ALREADY_PRESENT': 'RAPPROCHER_NO_CREATE',
            'ABSENT': 'EXPORTABLE_CREATE_VISITEUR',
            'AMBIGUOUS': 'QUARANTINE_HUMAN_DECISION',
            'INVALID_EMAIL': 'REJECTED',
            'DUPLICATE_SOURCE': 'QUARANTINE_DEDUP',
            'PRIVILEGED_ACCOUNT': 'REJECTED_EXCLUDED_FROM_BATCH',
        }[verdict],
    })

with open(S + '/WM31-IDENTITIES-MATRIX.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

counts = collections.Counter(r['verdict'] for r in rows)
summary = {
    'source_total': len(rows),
    'verdicts': dict(counts),
    'citadelle_profiles_total': len(cit_profiles),
    'citadelle_auth_users_total': len(cit_auth),
    'citadelle_probe_utc': cit['probe_utc'],
    'citadelle_host': cit['url_host'],
    'wm4_actions': dict(collections.Counter(r['wm4_action'] for r in rows)),
    'domains': dict(collections.Counter(r['email_domain'] for r in rows)),
    'cit_domains': dict(collections.Counter(norm(p['email']).split('@')[1] for p in cit_profiles if p.get('email'))),
    'overlap_fp': sorted({fp(canon(norm(p['email']))) for p in cit_profiles if p.get('email')} &
                         {r['canonical_fingerprint'] for r in rows}),
    'citadelle_distinct_canonical': len({canon(norm(p['email'])) for p in cit_profiles if p.get('email')}),
    'citadelle_target_duplicate_groups': {k: v for k, v in collections.Counter(
        fp(canon(norm(p['email']))) for p in cit_profiles if p.get('email')).items() if v > 1},
    'source_distinct_strict': len({norm(u['user_email']) for u in users}),
    'source_distinct_canonical': len({canon(norm(u['user_email'])) for u in users}),
}
json.dump(summary, open(S + '/gap1-summary.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print(json.dumps(summary, indent=2, ensure_ascii=False))
