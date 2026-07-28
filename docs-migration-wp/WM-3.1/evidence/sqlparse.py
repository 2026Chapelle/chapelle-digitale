"""Minimal MySQL dump INSERT parser (read-only). Extracts rows for named tables."""
import io, sys, json


def parse_values(s):
    """s = content between VALUES and trailing ';' — returns list of tuples of python values."""
    rows = []
    i = 0
    n = len(s)
    while i < n:
        # find start of a row
        while i < n and s[i] != '(':
            i += 1
        if i >= n:
            break
        i += 1
        row = []
        cur = io.StringIO()
        in_str = False
        is_null = False
        started = False
        while i < n:
            c = s[i]
            if in_str:
                if c == '\\':
                    nxt = s[i + 1]
                    mapping = {'n': '\n', 't': '\t', 'r': '\r', '0': '\0',
                               'b': '\b', 'Z': '\x1a', '\\': '\\', "'": "'",
                               '"': '"', '%': '\\%', '_': '\\_'}
                    cur.write(mapping.get(nxt, nxt))
                    i += 2
                    continue
                if c == "'":
                    if i + 1 < n and s[i + 1] == "'":
                        cur.write("'")
                        i += 2
                        continue
                    in_str = False
                    i += 1
                    continue
                cur.write(c)
                i += 1
                continue
            # not in string
            if c == "'":
                in_str = True
                started = True
                i += 1
                continue
            if c == ',':
                v = cur.getvalue()
                row.append(None if (not started and v.strip() == 'NULL') else (v if started else v.strip()))
                cur = io.StringIO()
                started = False
                i += 1
                continue
            if c == ')':
                v = cur.getvalue()
                row.append(None if (not started and v.strip() == 'NULL') else (v if started else v.strip()))
                rows.append(row)
                i += 1
                break
            cur.write(c)
            started = started or not c.isspace()
            i += 1
    return rows


def extract(dump_path, tables):
    out = {t: [] for t in tables}
    prefixes = {t: "INSERT INTO `%s` VALUES " % t for t in tables}
    with open(dump_path, 'r', encoding='utf-8', errors='replace', newline='') as f:
        for line in f:
            if not line.startswith('INSERT INTO `'):
                continue
            for t, p in prefixes.items():
                if line.startswith(p):
                    body = line[len(p):].rstrip()
                    if body.endswith(';'):
                        body = body[:-1]
                    out[t].extend(parse_values(body))
                    break
    return out


if __name__ == '__main__':
    dump = sys.argv[1]
    tables = sys.argv[2].split(',')
    res = extract(dump, tables)
    for t in tables:
        print(t, len(res[t]), file=sys.stderr)
    json.dump(res, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False)
