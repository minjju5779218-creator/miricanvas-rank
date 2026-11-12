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

import base64, io, colorsys
from PIL import Image


def _open(data_uri):
    raw = base64.b64decode(data_uri.split(',', 1)[1])
    im = Image.open(io.BytesIO(raw)).convert('RGBA')
    return im


def feat(data_uri):
    try:
        im = _open(data_uri)
    except Exception:
        return None
    w, h = im.size
    px = im.load()
    has_alpha = any(px[x, y][3] < 200 for x in range(0, w, 3) for y in range(0, h, 3))

    def solid(x, y):
        r, g, b, a = px[x, y]
        if has_alpha:
            return a >= 128
        return not (r > 245 and g > 245 and b > 245)

    pts = [(x, y) for y in range(h) for x in range(w) if solid(x, y)]
    if len(pts) < 20:
        return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    fill = len(pts) / float(bw * bh)
    aspect = bw / float(bh)

    # saturation (ignore near-white/near-black)
    sats = []
    for x, y in pts:
        r, g, b, a = px[x, y]
        hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if 0.08 < ll < 0.92:
            sats.append(ss)
    sat = sum(sats) / len(sats) if sats else 0

    # outline: edge pixels (solid next to non-solid) that are dark
    edge = dark = 0
    for x, y in pts:
        if x in (0, w - 1) or y in (0, h - 1):
            continue
        if not (solid(x - 1, y) and solid(x + 1, y) and solid(x, y - 1) and solid(x, y + 1)):
            edge += 1
            r, g, b, a = px[x, y]
            if 0.299 * r + 0.587 * g + 0.114 * b < 80:
                dark += 1
    outline = dark / edge if edge else 0

    # texture: share of interior neighbor pairs with small but non-zero color change (gradients, brush texture)
    soft = flat = 0
    for x, y in pts:
        if x + 1 < w and solid(x + 1, y):
            a1, a2 = px[x, y], px[x + 1, y]
            d = abs(a1[0] - a2[0]) + abs(a1[1] - a2[1]) + abs(a1[2] - a2[2])
            if d <= 6:
                flat += 1
            elif d <= 60:
                soft += 1
    texture = soft / float(soft + flat) if soft + flat else 0

    # dominant colors
    sub = Image.new('RGB', (len(pts), 1))
    sub.putdata([px[x, y][:3] for x, y in pts])
    q = sub.quantize(colors=6, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()
    counts = sorted(q.getcolors(), reverse=True)
    cols = []
    for cnt, idx in counts:
        if cnt / len(pts) < 0.05:
            continue
        r, g, b = pal[idx * 3: idx * 3 + 3]
        if any(abs(r - c[0]) + abs(g - c[1]) + abs(b - c[2]) < 60 for c in [tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) for h in cols]):
            continue
        cols.append('#%02x%02x%02x' % (r, g, b))
        if len(cols) == 4:
            break
    return [cols, round(sat * 100), round(outline * 100), round(texture * 100), round(fill * 100), round(aspect * 10)]




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

# style features per element (index 9 of E rows)
for key, v in c.items():
    if key.endswith('|E'):
        for r in v:
            r[:] = r[:9]
            f = feat(TH[r[7]]) if TH.get(r[7]) else None
            r.append(f)

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
