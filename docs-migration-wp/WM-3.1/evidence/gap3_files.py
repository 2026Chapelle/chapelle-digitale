# GAP 3 — inventaire et classement des 383 fichiers physiques. LECTURE SEULE.
import os, sys, json, csv, re, hashlib, struct, collections

S = sys.argv[1]
ROOT = sys.argv[2]  # .../files-extract/public_html/wp-content/uploads
dump = json.load(open(S + '/dump.json', encoding='utf-8'))

POSTS_COLS = ['ID', 'post_author', 'post_date', 'post_date_gmt', 'post_content', 'post_title',
              'post_excerpt', 'post_status', 'comment_status', 'ping_status', 'post_password',
              'post_name', 'to_ping', 'pinged', 'post_modified', 'post_modified_gmt',
              'post_content_filtered', 'post_parent', 'guid', 'menu_order', 'post_type',
              'post_mime_type', 'comment_count']
posts = {str(r[0]): dict(zip(POSTS_COLS, r)) for r in dump['wp_posts']}
pm = collections.defaultdict(dict)
for r in dump['wp_postmeta']:
    pm[str(r[1])][r[2]] = r[3]

attachments = {pid: p for pid, p in posts.items() if p['post_type'] == 'attachment'}

# --- index WP : chemin relatif -> (attachment_id, role) --------------------------
wp_index = {}          # normalised relative path -> dict
attach_meta_sizes = collections.defaultdict(list)
for aid, a in attachments.items():
    rel = (pm[aid].get('_wp_attached_file') or '').replace('\\', '/').lstrip('/')
    if rel:
        wp_index[rel.lower()] = {'attachment_id': aid, 'role': 'original', 'parent': str(a['post_parent'])}
    meta = pm[aid].get('_wp_attachment_metadata') or ''
    base_dir = os.path.dirname(rel)
    for m in re.finditer(r's:4:"file";s:\d+:"([^"]+)"', meta):
        f = m.group(1)
        if f == os.path.basename(rel):
            continue
        p = (base_dir + '/' + f).lstrip('/').lower()
        wp_index.setdefault(p, {'attachment_id': aid, 'role': 'sized_variant', 'parent': str(a['post_parent'])})
        attach_meta_sizes[aid].append(f)

# --- references EXTERIEURES au fichier lui-meme ---------------------------------
# On exclut le post attachment lui-meme et ses meta d'auto-description, sinon
# tout fichier de la mediatheque paraitrait "reference" par sa propre metadata.
SELF_META = {'_wp_attached_file', '_wp_attachment_metadata', '_wp_attachment_backup_sizes',
             '_wp_attachment_image_alt', '_wp_old_slug'}
haystack = []
for pid, p in posts.items():
    if p['post_type'] == 'attachment':
        continue
    haystack.append(p['post_content'] or '')
    haystack.append(p['post_excerpt'] or '')
    haystack.append(p['guid'] or '')
for r in dump['wp_postmeta']:
    if not r[3]:
        continue
    if str(r[1]) in attachments and r[2] in SELF_META:
        continue
    haystack.append(str(r[3]))
HAY = '\n'.join(haystack).lower()
# _thumbnail_id : un attachment designe comme image a la une est utilise
THUMBNAIL_IDS = {str(v) for pid, m in pm.items() for k, v in m.items() if k == '_thumbnail_id' and v}

EXT_MIME = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
    '.css': 'text/css', '.js': 'application/javascript', '.xml': 'application/xml',
    '.txt': 'text/plain', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
    '.zip': 'application/zip', '.json': 'application/json', '.html': 'text/html',
}

THUMB_RE = re.compile(r'-(\d{2,5})x(\d{2,5})(?:-\d+)?(\.[A-Za-z0-9]+)$')
SCALED_RE = re.compile(r'-(scaled|rotated|Optimized|optimized|e\d{10,})(\.[A-Za-z0-9]+)$')


def sniff(path, head):
    if head.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    if head.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    if head.startswith(b'GIF8'):
        return 'image/gif'
    if head.startswith(b'%PDF'):
        return 'application/pdf'
    if head.startswith(b'RIFF') and head[8:12] == b'WEBP':
        return 'image/webp'
    if head[4:8] == b'ftyp':
        return 'video/mp4'
    return ''


def png_dims(fh):
    fh.seek(0)
    sig = fh.read(24)
    if len(sig) < 24:
        return None
    w, h = struct.unpack('>II', sig[16:24])
    return w, h


def jpeg_dims(fh):
    fh.seek(0)
    data = fh.read(2)
    if data != b'\xff\xd8':
        return None
    while True:
        b = fh.read(1)
        if not b:
            return None
        if b != b'\xff':
            continue
        while b == b'\xff':
            b = fh.read(1)
            if not b:
                return None
        marker = b[0]
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            continue
        ln = fh.read(2)
        if len(ln) < 2:
            return None
        length = struct.unpack('>H', ln)[0]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            body = fh.read(5)
            if len(body) < 5:
                return None
            h, w = struct.unpack('>HH', body[1:5])
            return w, h
        fh.seek(length - 2, 1)


rows = []
for dirpath, _dirnames, filenames in os.walk(ROOT):
    for fn in filenames:
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, ROOT).replace('\\', '/')
        ext = os.path.splitext(fn)[1].lower()
        try:
            size = os.path.getsize(full)
        except OSError:
            size = -1
        sha = ''
        head = b''
        dims = None
        corrupt = ''
        try:
            with open(full, 'rb') as fh:
                head = fh.read(64)
                h = hashlib.sha256()
                fh.seek(0)
                for chunk in iter(lambda: fh.read(1 << 20), b''):
                    h.update(chunk)
                sha = h.hexdigest()
                if ext == '.png':
                    dims = png_dims(fh)
                elif ext in ('.jpg', '.jpeg'):
                    dims = jpeg_dims(fh)
        except Exception as e:
            corrupt = 'read_error:' + type(e).__name__

        mime_ext = EXT_MIME.get(ext, 'application/octet-stream')
        mime_sniff = sniff(full, head)
        mime = mime_sniff or mime_ext
        if size == 0:
            corrupt = corrupt or 'zero_byte'
        if mime_sniff and mime_ext != 'application/octet-stream' and mime_sniff != mime_ext:
            corrupt = corrupt or 'mime_mismatch(%s!=%s)' % (mime_sniff, mime_ext)
        if ext in ('.png', '.jpg', '.jpeg') and not dims and not corrupt:
            corrupt = 'header_unparsable'

        m = THUMB_RE.search(fn)
        derived_from = ''
        if m:
            derived_from = os.path.join(os.path.dirname(rel), THUMB_RE.sub(r'\3', fn)).replace('\\', '/')

        wp = wp_index.get(rel.lower())
        wp_id = wp['attachment_id'] if wp else ''
        wp_role = wp['role'] if wp else ''
        ref_sigs = []
        if rel.lower() in HAY:
            ref_sigs.append('path_in_content')
        elif fn.lower() in HAY:
            ref_sigs.append('filename_in_content')
        if wp_id and wp_id in THUMBNAIL_IDS:
            ref_sigs.append('featured_image')
        if wp and wp['parent'] not in ('', '0') and wp['parent'] in posts:
            ref_sigs.append('attached_to_post:' + wp['parent'])
        referenced_in_content = bool(ref_sigs)

        rows.append({
            'rel_path': rel,
            'file_name': fn,
            'extension': ext or '(none)',
            'size_bytes': size,
            'mime_type': mime,
            'mime_source': 'magic' if mime_sniff else 'extension',
            'sha256': sha,
            'width': dims[0] if dims else '',
            'height': dims[1] if dims else '',
            'wp_attachment_id': wp_id,
            'wp_reference_role': wp_role,
            'wp_parent_post': wp['parent'] if wp else '',
            'referenced_in_content': 'yes' if referenced_in_content else 'no',
            'reference_signals': '|'.join(ref_sigs) or 'none',
            'derived_from': derived_from,
            'user_content': 'yes' if rel.lower().startswith(tuple(str(y) + '/' for y in range(2015, 2031))) else 'no',
            'thumbnail_pattern': 'yes' if m else 'no',
            'generated_pattern': 'yes' if SCALED_RE.search(fn) else 'no',
            'corrupt_signal': corrupt,
        })

# ---- duplicate detection by checksum ----------------------------------------
by_sha = collections.defaultdict(list)
for r in rows:
    if r['sha256']:
        by_sha[r['sha256']].append(r['rel_path'])
by_sizeext = collections.defaultdict(list)
for r in rows:
    by_sizeext[(r['size_bytes'], r['extension'], r['width'], r['height'])].append(r['rel_path'])

names_present = {r['rel_path'].lower() for r in rows}

by_path = {r['rel_path']: r for r in rows}


def keeper_rank(path):
    """Plus petit = conserve. Priorite : original WP > reference contenu > plus petit id > chemin."""
    x = by_path[path]
    aid = int(x['wp_attachment_id']) if str(x['wp_attachment_id']).isdigit() else 10 ** 9
    return (
        0 if x['wp_reference_role'] == 'original' else 1,
        0 if x['referenced_in_content'] == 'yes' else 1,
        aid,
        len(path),
        path,
    )


for r in rows:
    grp = by_sha.get(r['sha256'], [])
    r['duplicate_group_size'] = len(grp)
    r['duplicate_group_sha'] = r['sha256'][:16] if len(grp) > 1 else ''
    keeper = min(grp, key=keeper_rank) if len(grp) > 1 else None
    r['duplicate_keeper'] = ('yes' if keeper == r['rel_path'] else 'no') if len(grp) > 1 else ''
    pgrp = by_sizeext.get((r['size_bytes'], r['extension'], r['width'], r['height']), [])
    r['probable_duplicate_group_size'] = len(pgrp)

    # ---- classification (exclusive, precedence) ----
    if r['corrupt_signal']:
        cls = 'CORRUPT'
    elif r['duplicate_group_size'] > 1 and r['duplicate_keeper'] == 'no':
        cls = 'EXACT_DUPLICATE'
    elif r['thumbnail_pattern'] == 'yes' and r['wp_reference_role'] == 'sized_variant':
        cls = 'THUMBNAIL'
    elif r['thumbnail_pattern'] == 'yes':
        cls = 'THUMBNAIL' if r['user_content'] == 'yes' else 'GENERATED_VARIANT'
    elif r['generated_pattern'] == 'yes':
        cls = 'GENERATED_VARIANT'
    elif r['wp_reference_role'] == 'original':
        cls = 'ORIGINAL_USED' if r['referenced_in_content'] == 'yes' else 'ORIGINAL_UNUSED'
    elif r['user_content'] == 'yes':
        # fichier utilisateur non declare dans la mediatheque
        cls = 'ORPHAN'
    elif r['referenced_in_content'] == 'yes':
        cls = 'REFERENCED_MISSING_CONTEXT'
    elif r['rel_path'].split('/')[0] in ('elementor', 'rank-math', 'wpforms', 'bb-plugin'):
        # artefacts de cache/plugin regenerables par la plateforme d'origine
        cls = 'GENERATED_VARIANT'
    elif r['probable_duplicate_group_size'] > 1:
        cls = 'PROBABLE_DUPLICATE'
    else:
        cls = 'ORPHAN'

    # un thumbnail dont l'original physique est absent
    if cls == 'THUMBNAIL' and r['derived_from'] and r['derived_from'].lower() not in names_present:
        cls = 'REFERENCED_MISSING_CONTEXT'

    r['classification'] = cls
    r['wm4_action'] = {
        'ORIGINAL_USED': 'EXPORTABLE',
        'ORIGINAL_UNUSED': 'EXPORTABLE',
        'THUMBNAIL': 'REJECTED_REGENERABLE',
        'GENERATED_VARIANT': 'REJECTED_REGENERABLE',
        'EXACT_DUPLICATE': 'REJECTED_DEDUP',
        'PROBABLE_DUPLICATE': 'QUARANTINED',
        'ORPHAN': 'QUARANTINED',
        'REFERENCED_MISSING_CONTEXT': 'QUARANTINED',
        'CORRUPT': 'REJECTED_CORRUPT',
        'UNCLASSIFIED_REVIEW_REQUIRED': 'QUARANTINED',
    }[cls]

rows.sort(key=lambda r: r['rel_path'])
cols = ['rel_path', 'file_name', 'extension', 'size_bytes', 'mime_type', 'mime_source', 'sha256',
        'width', 'height', 'wp_attachment_id', 'wp_reference_role', 'wp_parent_post',
        'referenced_in_content', 'reference_signals', 'user_content', 'derived_from', 'thumbnail_pattern',
        'generated_pattern', 'duplicate_group_sha', 'duplicate_group_size', 'duplicate_keeper',
        'probable_duplicate_group_size', 'corrupt_signal', 'classification', 'wm4_action']
with open(S + '/WM31-PHYSICAL-FILES-INVENTORY.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore')
    w.writeheader()
    w.writerows(rows)

dupe_groups = {k: v for k, v in by_sha.items() if len(v) > 1}
summary = {
    'files_total': len(rows),
    'bytes_total': sum(r['size_bytes'] for r in rows),
    'classes': dict(collections.Counter(r['classification'] for r in rows)),
    'wm4_actions': dict(collections.Counter(r['wm4_action'] for r in rows)),
    'by_extension': dict(collections.Counter(r['extension'] for r in rows)),
    'by_mime': dict(collections.Counter(r['mime_type'] for r in rows)),
    'distinct_checksums': len(by_sha),
    'exact_duplicate_groups': len(dupe_groups),
    'exact_duplicate_files': sum(len(v) for v in dupe_groups.values()),
    'exact_duplicate_redundant': sum(len(v) - 1 for v in dupe_groups.values()),
    'duplicate_groups_detail': {k[:16]: sorted(v) for k, v in sorted(dupe_groups.items())},
    'wp_attachments_in_db': len(attachments),
    'wp_originals_matched_on_disk': sum(1 for r in rows if r['wp_reference_role'] == 'original'),
    'wp_variants_matched_on_disk': sum(1 for r in rows if r['wp_reference_role'] == 'sized_variant'),
    'wp_originals_declared_missing_on_disk': sorted(
        p for p in wp_index if wp_index[p]['role'] == 'original' and p not in names_present),
    'corrupt': [r['rel_path'] for r in rows if r['corrupt_signal']],
    'top_dirs': dict(collections.Counter(r['rel_path'].split('/')[0] for r in rows)),
    'bytes_by_class': {k: sum(r['size_bytes'] for r in rows if r['classification'] == k)
                       for k in sorted({r['classification'] for r in rows})},
    'reference_signal_mix': dict(collections.Counter(r['reference_signals'] for r in rows)),
    'originals_used': sum(1 for r in rows if r['classification'] == 'ORIGINAL_USED'),
    'originals_unused': sum(1 for r in rows if r['classification'] == 'ORIGINAL_UNUSED'),
}
json.dump(summary, open(S + '/gap3-summary.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
brief = {k: v for k, v in summary.items() if k not in ('duplicate_groups_detail',)}
print(json.dumps(brief, indent=2, ensure_ascii=False))
