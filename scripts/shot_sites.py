#!/usr/bin/env python3
"""shot_sites.py — real-browser screenshots of preview sites at two device classes.
Mobile 390 (D1) full-page, desktop 1930 (D5) viewport. Saves to /tmp/shots/."""
import sys
from playwright.sync_api import sync_playwright

SITES = [
    ('the-harbor-brass-adb214', 'harbor'),
    ('the-copper-needle-7132bd', 'needle'),
    ('the-sage-meadow-be0456', 'sage'),
    ('goldenfolio-6a5a42', 'foliol'),
]
BASE = 'https://webd-1-zb89.onrender.com/api/beast/site/'

with sync_playwright() as p:
    browser = p.chromium.launch()
    for sid, name in SITES:
        # mobile D1 — full page
        m = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
        pg = m.new_page()
        try:
            pg.goto(f'{BASE}{sid}', timeout=90000, wait_until='networkidle')
        except Exception:
            pass
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f'/tmp/shots/{name}-mob.png', full_page=True)
        m.close()
        # desktop D5 — viewport (hero + first sections)
        d = browser.new_context(viewport={'width': 1930, 'height': 1080}, device_scale_factor=1)
        pg = d.new_page()
        try:
            pg.goto(f'{BASE}{sid}', timeout=90000, wait_until='networkidle')
        except Exception:
            pass
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f'/tmp/shots/{name}-desk.png')
        d.close()
        print(f'{name} done', flush=True)
    browser.close()
print('ALL SHOTS DONE')
