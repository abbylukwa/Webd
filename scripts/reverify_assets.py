#!/usr/bin/env python3
"""Re-verify assets with CORRECT filenames + retry timed-out pages."""
import json, re
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request

BASE = 'https://webd-1-zb89.onrender.com/api/beast/site/'
A = json.load(open('/tmp/audit.json'))
UA = {'User-Agent': 'beast-audit/1.0'}

def fetch(sid, page):
    try:
        r = urlopen(Request(f'{BASE}{sid}?page={page}', headers=UA), timeout=60)
        return page, r.status, r.read()
    except Exception as e:
        return page, str(e)[:50], b''

jobs = []
for r in A:
    sid = r['id']
    for f in ['assets/favicon.svg', 'manifest.json', 'robots.txt', 'sitemap.xml', 'ATTRIBUTION.txt', '404.html', 'offline.html', 'sitemap.html', 'index.html']:
        jobs.append((sid, r['brand'], f))
    # retry every timeout-recorded page
    for b in r['broken']:
        pg = b.split(' → ')[0]
        jobs.append((sid, r['brand'], pg))

def run(job):
    sid, brand, f = job
    page, code, body = fetch(sid, f)
    return brand, sid, page, code, len(body)

with ThreadPoolExecutor(max_workers=6) as ex:
    res = list(ex.map(run, jobs))

from collections import defaultdict
stat = defaultdict(list)
offline_sample = b''
for brand, sid, page, code, n in res:
    stat[page].append((brand, code, n))
    if page == 'offline.html' and isinstance(code, int) and code == 200 and n > len(offline_sample):
        offline_sample = body if False else b''  # body not returned here; skip

ok = fail = 0
for page, rows in sorted(stat.items()):
    good = sum(1 for _, c, _ in rows if isinstance(c, int) and c == 200)
    total = len(rows)
    ok += good; fail += total - good
    codes = [f'{c}' for _, c, _ in rows if not (isinstance(c, int) and c == 200)]
    print(f'{page:24} {good}/{total} 200' + (f'   non-200: {codes[:4]}' if codes else ''))
print(f'\nTOTAL: {ok} ok, {fail} not-ok')
