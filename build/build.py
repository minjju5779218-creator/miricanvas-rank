#!/usr/bin/env python3
"""Build the MiriCanvas ranking site (ranking-only, GitHub Pages).
usage: python3 build.py TEMPLATE DATA_JSON PREV_JSON_OR_- DATE(YYYY.MM.DD) OUTDIR
- DATA_JSON: {"kw|TIER|E|C": rows} compact rows from collect.js (top 100 per tier)
- PREV_JSON: previous data/current.json (or - for none) -> rank change badges
Writes OUTDIR/index.html and OUTDIR/data/current.json
Images load from the MiriCanvas CDN.
"""
import json, os, re, sys

tpl_p, data_p, prev_p, date, out = sys.argv[1:6]
t = open(tpl_p, encoding='utf-8').read()
c = json.load(open(data_p, encoding='utf-8'))
if isinstance(c, dict) and 'data' in c and 'date' in c:
    c = c['data']
prev = json.load(open(prev_p, encoding='utf-8')) if prev_p != '-' and os.path.exists(prev_p) else {}

groups = re.search(r'const GROUPS = \[(.*?)\n\];', t, re.S).group(1)
kws = []
for line in groups.splitlines():
    m = re.search(r'\[\s*"[^"]+",\s*\[(.*)\]\s*\]', line)
    if m:
        kws += re.findall(r'"([^"]+)"', m.group(1))
kws = [k for k in kws if c.get(f'{k}|PREMIUM|E')]

# keep only the first 9 fields of element rows
for key, v in c.items():
    if key.endswith('|E'):
        for r in v:
            del r[9:]

prev_ids = {}
pdata = prev.get('data', prev) if isinstance(prev, dict) else {}
for key, v in pdata.items():
    if key.endswith('|E'):
        prev_ids[key[:-2]] = [r[1] for r in v]
prev_date = prev.get('date', '') if isinstance(prev, dict) else ''

os.makedirs(os.path.join(out, 'data'), exist_ok=True)
html = (t.replace('__DATA__', json.dumps(c, ensure_ascii=False, separators=(',', ':')))
         .replace('__THUMBS__', '{}')
         .replace('__REMOTE__', 'true')
         .replace('__KWFILE__', '{}')
         .replace('__PREV__', json.dumps(prev_ids, separators=(',', ':')))
         .replace('__PREVDATE__', prev_date)
         .replace('__DATE__', date)
         .replace('__NKW__', str(len(kws))))
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)
json.dump({'date': date, 'data': c}, open(os.path.join(out, 'data', 'current.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
print('keywords', len(kws), 'index bytes', len(html.encode()))
