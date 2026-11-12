#!/usr/bin/env python3
"""Rebuild the MiriCanvas ranking web app.
usage: python3 build.py TEMPLATE DATA_JSON THUMBS_JSON PREV_JSON_OR_- DATE(YYYY.MM.DD) OUTDIR [--pages]
--pages: GitHub Pages build (images load from miricanvas CDN, no t/ thumbnail files)
- DATA_JSON: {"kw|TIER|E|C": rows}  (compact rows from collect.js)
- THUMBS_JSON: {thumbPath: dataUri}
- PREV_JSON: previous data/current.json (or - for none)
Writes OUTDIR/index.html, OUTDIR/t/<n>.json, OUTDIR/data/current.json
"""
import json, os, re, sys

tpl_p, data_p, th_p, prev_p, date, out = sys.argv[1:7]
PAGES = '--pages' in sys.argv[7:]
t = open(tpl_p, encoding='utf-8').read()
c = json.load(open(data_p, encoding='utf-8'))
TH = json.load(open(th_p, encoding='utf-8'))
prev = json.load(open(prev_p, encoding='utf-8')) if prev_p != '-' and os.path.exists(prev_p) else {}

groups = re.search(r'const GROUPS = \[(.*?)\n\];', t, re.S).group(1)
kws = []
for line in groups.splitlines():
    m = re.search(r'\[\s*"[^"]+",\s*\[(.*)\]\s*\]', line)
    if m:
        kws += re.findall(r'"([^"]+)"', m.group(1))
kws = [k for k in kws if f'{k}|PREMIUM|E' in c]

if '--pages' not in sys.argv: os.makedirs(os.path.join(out, 't'), exist_ok=True)
os.makedirs(os.path.join(out, 'data'), exist_ok=True)
top, kwfile = {}, {}
for i, k in enumerate(kws):
    kwfile[k] = i
    per = {}
    for key, v in c.items():
        if key.split('|')[0] != k:
            continue
        if key.endswith('|E'):
            for r in v:
                if r[7] in TH and TH[r[7]]:
                    per[r[7]] = TH[r[7]]
        else:
            for r in v[:8]:
                p = r[5][0] if r[5] else None
                if p in TH and TH[p]:
                    per[p] = TH[p]
    for r in c[f'{k}|PREMIUM|E'][:5]:
        if r[7] in TH and TH[r[7]]:
            top[r[7]] = TH[r[7]]
    if not PAGES:
        json.dump(per, open(os.path.join(out, 't', f'{i}.json'), 'w'), separators=(',', ':'))

# previous ranks: {"kw|TIER": [ids in rank order]}
prev_ids = {}
pdata = prev.get('data', prev) if isinstance(prev, dict) else {}
for key, v in pdata.items():
    if key.endswith('|E'):
        prev_ids[key[:-2]] = [r[1] for r in v]
prev_date = prev.get('date', '') if isinstance(prev, dict) else ''

html = (t.replace('__DATA__', json.dumps(c, ensure_ascii=False, separators=(',', ':')))
         .replace('__THUMBS__', '{}' if PAGES else json.dumps(top, separators=(',', ':')))
         .replace('__REMOTE__', 'true' if PAGES else 'false')
         .replace('__KWFILE__', json.dumps(kwfile, ensure_ascii=False))
         .replace('__PREV__', json.dumps(prev_ids, separators=(',', ':')))
         .replace('__PREVDATE__', prev_date)
         .replace('__DATE__', date)
         .replace('__NKW__', str(len(kws))))
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)
json.dump({'date': date, 'data': c}, open(os.path.join(out, 'data', 'current.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('keywords', len(kws), 'index bytes', len(html.encode()), 'files', len(kws) + 2)
