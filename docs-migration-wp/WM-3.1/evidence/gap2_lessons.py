# GAP 2 — qualification individuelle des 27 lecons sans video. Read-only.
import json, sys, csv, re, collections, hashlib

S = sys.argv[1]
dump = json.load(open(S + '/dump.json', encoding='utf-8'))

POSTS_COLS = ['ID', 'post_author', 'post_date', 'post_date_gmt', 'post_content', 'post_title',
              'post_excerpt', 'post_status', 'comment_status', 'ping_status', 'post_password',
              'post_name', 'to_ping', 'pinged', 'post_modified', 'post_modified_gmt',
              'post_content_filtered', 'post_parent', 'guid', 'menu_order', 'post_type',
              'post_mime_type', 'comment_count']
posts = {str(r[0]): dict(zip(POSTS_COLS, r)) for r in dump['wp_posts']}

pm = collections.defaultdict(dict)          # post_id -> {key: value}
pm_all = collections.defaultdict(list)      # post_id -> [(key, value)]
for r in dump['wp_postmeta']:
    pid = str(r[1])
    pm[pid][r[2]] = r[3]
    pm_all[pid].append((r[2], r[3]))

lessons = {pid: p for pid, p in posts.items() if p['post_type'] == 'lesson'}
assert len(lessons) == 38, len(lessons)

YT_RE = re.compile(r'(youtube\.com|youtu\.be|vimeo\.com)', re.I)
VIDEO_FILE_RE = re.compile(r'\.(mp4|m4v|webm|ogv|mov|avi|mkv)\b', re.I)
IFRAME_RE = re.compile(r'<iframe|\[video\]|wp-video|videopress|\[embed', re.I)
# Marqueurs de redaction inachevee laisses par l'auteur dans le corps de la lecon.
PLACEHOLDER_RE = re.compile(r"\[\s*(ins[ée]rer|[àa]\s+compl[ée]ter|todo|tbd|lorem|xxx)[^\]]*\]", re.I)
PLACEHOLDER_VIDEO_RE = re.compile(r"\[[^\]]*vid[ée]o[^\]]*\]", re.I)


def video_meta_nonempty(pid):
    v = pm[pid].get('_video')
    if not v:
        return False, ''
    # Tutor stores a serialized array; "empty" = source empty
    m = re.search(r's:6:"source";s:\d+:"([^"]*)"', v)
    src = m.group(1) if m else ''
    if not src or src in ('-1', 'html5') and not re.search(r'source_video_id|source_external_url|source_html5', v):
        pass
    has = bool(src) and src not in ('', '-1')
    # check any non-empty source_* value
    vals = re.findall(r's:\d+:"source_[a-z0-9_]+";s:(\d+):"', v)
    nonempty_payload = any(int(x) > 0 for x in vals)
    return (has and nonempty_payload), (src or '')


def attachments(pid):
    raw = pm[pid].get('_tutor_attachments')
    if not raw:
        return []
    ids = re.findall(r'i:\d+;s:\d+:"(\d+)"', raw) or re.findall(r'i:\d+;i:(\d+);', raw)
    return ids


def text_metrics(html):
    html = html or ''
    plain = re.sub(r'<[^>]+>', ' ', html)
    plain = re.sub(r'&nbsp;|&#160;', ' ', plain)
    plain = re.sub(r'\s+', ' ', plain).strip()
    words = len([w for w in plain.split(' ') if w])
    headings = len(re.findall(r'<h[1-6][^>]*>', html, re.I))
    lists = len(re.findall(r'<li[^>]*>', html, re.I))
    return len(html), len(plain), words, headings, lists


# course/topic resolution
topics = {pid: p for pid, p in posts.items() if p['post_type'] == 'topics'}
courses = {pid: p for pid, p in posts.items() if p['post_type'] == 'courses'}

rows = []
for pid, p in lessons.items():
    hv, src = video_meta_nonempty(pid)
    if hv:
        continue
    topic_id = str(p['post_parent'])
    topic = topics.get(topic_id)
    course_id = pm[pid].get('_tutor_course_id_for_lesson') or (str(topic['post_parent']) if topic else '')
    course = courses.get(str(course_id))
    hlen, plen, words, headings, lists = text_metrics(p['post_content'])
    atts = attachments(pid)
    att_details = []
    for a in atts:
        ap = posts.get(a)
        att_details.append({
            'id': a,
            'mime': ap['post_mime_type'] if ap else 'MISSING',
            'file': (pm[a].get('_wp_attached_file') if ap else '') or '',
            'present_in_db': bool(ap),
        })
    att_video = [a for a in att_details if a['mime'].startswith('video') or VIDEO_FILE_RE.search(a['file'] or '')]

    # video reference found elsewhere?
    elsewhere = []
    if YT_RE.search(p['post_content'] or ''):
        elsewhere.append('content_video_url')
    if VIDEO_FILE_RE.search(p['post_content'] or ''):
        elsewhere.append('content_video_file')
    if IFRAME_RE.search(p['post_content'] or ''):
        elsewhere.append('content_embed_markup')
    if att_video:
        elsewhere.append('attachment_video')
    for k, v in pm_all[pid]:
        if k == '_video':
            continue
        if v and YT_RE.search(str(v)):
            elsewhere.append('meta:' + k)
    if p['post_excerpt'] and YT_RE.search(p['post_excerpt']):
        elsewhere.append('excerpt_video_url')
    # course-level video fallback
    course_video = ''
    if course:
        chv, csrc = video_meta_nonempty(str(course_id))
        if chv:
            course_video = 'course_level_video(' + csrc + ')'
            elsewhere.append(course_video)
    elsewhere = sorted(set(elsewhere))

    body = p['post_content'] or ''
    ph = PLACEHOLDER_RE.findall(body)
    ph_video = bool(PLACEHOLDER_VIDEO_RE.search(body) and PLACEHOLDER_RE.search(body))

    has_text = words >= 30
    has_doc = bool([a for a in att_details if not a['mime'].startswith('video')])
    is_empty = plen == 0 and not atts

    # ---- classification (exclusive, precedence) ----
    if elsewhere:
        cls = 'VIDEO_REFERENCE_FOUND_ELSEWHERE'
    elif is_empty:
        cls = 'EMPTY'
    elif ph:
        # corps redactionnel explicitement inacheve (marqueur auteur)
        cls = 'INCOMPLETE'
    elif has_text and has_doc:
        cls = 'TEXT_AND_DOCUMENT_VALID'
    elif has_doc and not has_text:
        cls = 'DOCUMENT_VALID'
    elif has_text and not has_doc:
        cls = 'TEXT_VALID'
    elif 0 < words < 30:
        cls = 'INCOMPLETE'
    else:
        cls = 'TO_REVIEW'

    # broken attachment reference => review overrides "valid"
    broken = [a for a in att_details if not a['present_in_db']]
    if broken and cls in ('DOCUMENT_VALID', 'TEXT_AND_DOCUMENT_VALID'):
        cls = 'TO_REVIEW'

    decision = {
        'TEXT_VALID': 'MIGRABLE',
        'TEXT_AND_DOCUMENT_VALID': 'MIGRABLE',
        'DOCUMENT_VALID': 'MIGRABLE_AVEC_RESERVE',
        'VIDEO_REFERENCE_FOUND_ELSEWHERE': 'MIGRABLE_AVEC_RESERVE',
        'INCOMPLETE': 'MIGRABLE_AVEC_RESERVE',
        'EMPTY': 'QUARANTAINE',
        'TO_REVIEW': 'DECISION_HUMAINE',
    }[cls]

    rows.append({
        'lesson_id': pid,
        'post_status': p['post_status'],
        'slug': p['post_name'],
        'course_id': course_id,
        'course_slug': course['post_name'] if course else 'UNRESOLVED',
        'topic_id': topic_id if topic else 'NO_TOPIC',
        'topic_slug': topic['post_name'] if topic else 'NO_TOPIC',
        'menu_order': p['menu_order'],
        'content_html_len': hlen,
        'content_text_len': plen,
        'word_count': words,
        'headings': headings,
        'list_items': lists,
        'excerpt_len': len(p['post_excerpt'] or ''),
        'video_meta_present': 'yes' if '_video' in pm[pid] else 'no',
        'video_meta_source': src or '',
        'attachments_n': len(atts),
        'attachments_ok': len([a for a in att_details if a['present_in_db']]),
        'attachments_broken': len(broken),
        'attachment_mimes': '|'.join(sorted({a['mime'] for a in att_details})) or '',
        'video_reference_elsewhere': '|'.join(elsewhere) or 'none',
        'author_placeholder_found': 'yes' if ph else 'no',
        'author_placeholder_count': len(ph),
        'placeholder_requests_video': 'yes' if ph_video else 'no',
        'pedagogical_completeness': ('incomplete_placeholder' if ph else
                                     'complete' if (has_text and headings + lists > 0) else
                                     'partial' if has_text else
                                     'document_only' if has_doc else 'insufficient'),
        'classification': cls,
        'migration_decision': decision,
        'human_review_required': 'yes' if (ph or cls in ('TO_REVIEW', 'EMPTY')) else 'no',
        'content_sha256_16': hashlib.sha256((p['post_content'] or '').encode('utf-8')).hexdigest()[:16],
    })

rows.sort(key=lambda r: (r['course_id'], int(r['lesson_id'])))
with open(S + '/WM31-LESSONS-WITHOUT-VIDEO-MATRIX.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

summary = {
    'lessons_total': len(lessons),
    'lessons_with_video': len(lessons) - len(rows),
    'lessons_without_video': len(rows),
    'classes': dict(collections.Counter(r['classification'] for r in rows)),
    'decisions': dict(collections.Counter(r['migration_decision'] for r in rows)),
    'by_course': dict(collections.Counter(r['course_slug'] for r in rows)),
    'completeness': dict(collections.Counter(r['pedagogical_completeness'] for r in rows)),
    'word_count_min': min(r['word_count'] for r in rows),
    'word_count_max': max(r['word_count'] for r in rows),
    'word_count_total': sum(r['word_count'] for r in rows),
    'attachments_total': sum(r['attachments_n'] for r in rows),
    'attachments_broken_total': sum(r['attachments_broken'] for r in rows),
    'placeholder_lessons': sum(1 for r in rows if r['author_placeholder_found'] == 'yes'),
    'human_review_required': sum(1 for r in rows if r['human_review_required'] == 'yes'),
    'lessons_with_video_ids': sorted((int(k) for k in lessons if k not in {r['lesson_id'] for r in rows})),
    'lessons_without_video_ids': sorted(int(r['lesson_id']) for r in rows),
}
json.dump(summary, open(S + '/gap2-summary.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print(json.dumps(summary, indent=2, ensure_ascii=False))
