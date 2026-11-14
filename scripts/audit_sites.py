#!/usr/bin/env python3
"""audit_sites.py — full live audit of every for-sale Beast site.

For each site: fetch every HTML page listed in sitemap.html + core assets,
verify HTTP 200s, extract per-device layout stamps (data-layout="Dx:id"),
nav outline, img/alt counts, and the footer stamp. Then compare across
sites: palettes, hero/nav variants, motifs, and per-page stamp strings.
Writes /tmp/audit.json for the next step.
"""
import json, re, sys
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

BASE = 'https://webd-1-zb89.onrender.com/api/beast/site/'
STATE = '/tmp/live4.json'
UA = {'User-Agent': 'beast-audit/1.0'}

def fetch(site_id, page):
    url = f'{BASE}{site_id}?page={page}'
    try:
        r = urlopen(Request(url, headers=UA), timeout=45)
        return page, r.status, r.read()
    except HTTPError as e:
        return page, e.code, b''
    except Exception as e:
        return page, str(e)[:40], b''

def links(html):
    return sorted(set(re.findall(r'href="([^"#?]+\.html[^"]*)"', html.decode('utf-8', 'ignore'))))

def stamps(html):
    h = html.decode('utf-8', 'ignore')
    per = {}
    for dev, lay in re.findall(r'data-layout="(D\d):([\w-]+)"', h):
        per.setdefault(dev, set()).add(lay)
    foot = re.search(r'Grown by Beast Web Developer[^<]*', h)
    imgs = len(re.findall(r'<img\b', h))
    alts = len(re.findall(r'<img\b[^>]*\balt="[^"]+"', h))
    nav = re.search(r'<nav[^>]*>(.*?)</nav>', h, re.S)
    navitems = re.findall(r'>([^<>]{2,30})</a>', nav.group(1))[:10] if nav else []
    return per, (foot.group(0)[:110] if foot else ''), imgs, alts, [n.strip() for n in navitems]

def audit_site(site):
    sid, brand = site['id'], site['brand']
    out = {'id': sid, 'brand': brand, 'pages': {}, 'broken': [], 'assets': {}}
    # core files
    core = ['index.html', 'sitemap.html', 'sitemap.xml', 'robots.xml', 'ATTRIBUTION.txt', 'manifest.webmanifest', 'favicon.svg', 'search-index.json']
    for page in core:
        p, code, body = fetch(sid, page)
        out['assets'][page] = {'code': code, 'bytes': len(body)}
        if page == 'sitemap.html' and code == 200:
            for lnk in links(body):
                if lnk not in core and lnk not in core_pages(out):
                    out.setdefault('queue', []).append(lnk)
        if page == 'index.html' and code == 200:
            out['pages']['index.html'] = analyze(body)
    # every linked page (product detail, journal posts, support pages)
    for page in sorted(set(out.get('queue', []))):
        p, code, body = fetch(sid, page)
        if code == 200 and page.endswith('.html'):
            out['pages'][page] = analyze(body)
        elif code != 200:
            out['broken'].append(f'{page} → {code}')
    # fetch remaining pages from state plan that sitemap may not list
    for pg in site.get('pages', []):
        f = pg.get('file')
        if f and f not in out['pages'] and f.endswith('.html'):
            p, code, body = fetch(sid, f)
            if code == 200:
                out['pages'][f] = analyze(body)
            else:
                out['broken'].append(f'{f} → {code}')
    return out

def core_pages(out):
    return set(out.get('queue', []))

def analyze(body):
    per, foot, imgs, alts, nav = stamps(body)
    devs = {d: sorted(v) for d, v in sorted(per.items())}
    total = len(set(l for v in per.values() for l in v))
    return {'bytes': len(body), 'stamps': devs, 'distinct': total, 'footer': foot, 'imgs': imgs, 'alts_ok': alts, 'nav': nav}

def main():
    state = json.load(open(STATE))
    sites = [s for s in state['sites'] if s.get('status') == 'for-sale']
    print(f'auditing {len(sites)} for-sale sites…')
    with ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(audit_site, sites))
    json.dump(results, open('/tmp/audit.json', 'w'), indent=1)
    # ---- per-site summary ----
    for r in results:
        np = len(r['pages'])
        nb = len(r['broken'])
        homes = r['pages'].get('index.html', {})
        devs = homes.get('stamps', {})
        home_stamp = ' '.join(f'{d}:{",".join(v)}' for d, v in devs.items())[:90]
        assets_ok = sum(1 for a in r['assets'].values() if isinstance(a.get('code'), int) and a['code'] == 200)
        imgs = sum(p['imgs'] for p in r['pages'].values()); alts = sum(p['alts_ok'] for p in r['pages'].values())
        dist = len(set(l for p in r['pages'].values() for v in p['stamps'].values() for l in v))
        print(f"\n== {r['brand']} ({r['id']}) ==")
        print(f'  pages fetched: {np}  assets 200: {assets_ok}/8  broken: {nb} {r["broken"][:4]}')
        print(f'  home stamps: {home_stamp}')
        print(f'  site-wide distinct layouts: {dist}   imgs {imgs} (alt {alts})')
        for f, p in sorted(r['pages'].items()):
            if f != 'index.html':
                d5 = ' '.join(f'{d}:{v[0] if v else "?"}' for d, v in p['stamps'].items())
                print(f'    {f:28} {p["bytes"]//1024:4}KB  {d5[:80]}')

if __name__ == '__main__':
    main()
