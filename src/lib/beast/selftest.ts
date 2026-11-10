// Beast Self-Test — every feature, tested feature-by-feature.
// Groups:
//   A · Generator (pure): determinism, D1–D5, structure, SEO, WCAG, dark mode,
//       copyright, uniqueness/infinity, motifs, a11y
//   B · Design knowledge: layout book, device law, 12-book library
//   C · Engine (sandboxed): lifecycle, QA record, ZIP integrity, day catch-up,
//       owner/clear/delete
// The engine tests redirect BEAST_DATA_DIR to a throwaway temp dir, so the
// live studio state is never touched. The same suite runs in-app (Test Center
// tab → /api/beast/test) and from the CLI (bun scripts/test-beast.ts).
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { renderSite, renderSupportFiles } from './render';
import { buildPalette, deriveDarkTokens } from './palette';
import { seedFrom } from './rng';
import { DEVICE_CLASSES, STAGES, NICHES } from './spec';
import { LAYOUTS } from './layouts';
import { LIBRARY } from './knowledge';

export type TestResult = {
  id: string;
  group: 'A · Generator' | 'B · Design knowledge' | 'C · Engine (sandboxed)';
  feature: string;
  pass: boolean;
  detail: string;
};

const YEAR = new Date().getFullYear();

function check(id: string, group: TestResult['group'], feature: string, ok: boolean, detail: string): TestResult {
  return { id, group, feature, pass: ok, detail };
}

/* ============ GROUP A · Generator ============ */

function testDeterminism(): TestResult[] {
  const a1 = renderSite('determinism-seed', 'T Owner');
  const a2 = renderSite('determinism-seed', 'T Owner');
  const b = renderSite('another-seed', 'T Owner');
  return [
    check('A1', 'A · Generator', 'Seed determinism — same seed, identical site, forever',
      a1.html === a2.html && a1.brand === a2.brand,
      a1.html === a2.html ? `re-render byte-identical (${a1.html.length.toLocaleString()} bytes)` : 're-render differs!'),
    check('A1b', 'A · Generator', 'Different seeds produce different sites',
      b.html !== a1.html && b.brand !== undefined,
      `seed B → "${b.brand}" vs seed A → "${a1.brand}"`),
  ];
}

function testDeviceBreakpoints(): TestResult[] {
  const r = renderSite('breakpoint-seed', 'T Owner');
  const html = r.html;
  const marks = [
    ['D1 base (≤640) — 1-col stack', 'gridFeat{display:grid;grid-template-columns:1fr'],
    ['D2 (641–1024) — 2-col grid', '@media (min-width:641px)'],
    ['D3 (1025–1440) — 3-col grid', '@media (min-width:1025px)'],
    ['D4 (1441–1920) — 4-col grid', '@media (min-width:1441px)'],
    ['D5 (≥1921) — 5-col grid', '@media (min-width:1921px)'],
    ['D2 2-col features', 'gridFeat{grid-template-columns:repeat(2,1fr)'],
    ['D3 3-col features', 'gridFeat{grid-template-columns:repeat(3,1fr)'],
    ['D4 4-col features', 'gridFeat{grid-template-columns:repeat(4,1fr)'],
    ['D5 5-col features', 'gridFeat{grid-template-columns:repeat(5,1fr)'],
    ['D1 drawer nav', '.drawer{position:fixed'],
    ['D1 sticky mobile CTA bar', '.mbar{position:fixed'],
    ['D4 mega footer unlock', '.mega-only{display:none}'],
    ['relative units (fr + clamp + aspect-ratio)', 'aspect-ratio:'],
  ];
  const missing = marks.filter(([, needle]) => !html.includes(needle)).map(([label]) => label);
  return [
    check('A2', 'A · Generator', 'One site → five structural device layouts (D1–D5)',
      missing.length === 0,
      missing.length === 0 ? 'all 5 breakpoint layers + column laws + D1 extras present' : `missing: ${missing.join('; ')}`),
  ];
}

function testStructure(): TestResult[] {
  const r = renderSite('structure-seed', 'T Owner');
  const html = r.html;
  const sections = (html.match(/<section/g) || []).length;
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let jsonOk = false;
  try {
    const parsed = JSON.parse(jsonLd![1]);
    jsonOk = parsed['@context'] === 'https://schema.org' && !!parsed['@type'];
  } catch { /* ignore */ }
  const landmarks = ['<header class="nav"', '<main id="main">', '<footer class="site">', '<nav class="drawer"', 'Skip to content', '<form', 'lang="en"', 'name="viewport"'];
  const missingLandmarks = landmarks.filter((l) => !html.includes(l));
  // faq (and its <details>) is seed-dependent — only assert when the section is present
  const faqConsistent = !html.includes('id="faq"') || html.includes('<details>');
  return [
    check('A3', 'A · Generator', 'Rich one-page structure — 7+ sections, semantic landmarks',
      sections >= 7 && missingLandmarks.length === 0 && faqConsistent,
      `${sections} sections; ${missingLandmarks.length === 0 ? 'header/main/footer/nav/skip/form all present' : 'missing: ' + missingLandmarks.join(', ')}; faq↔details consistent: ${faqConsistent}`),
    check('A3b', 'A · Generator', 'SEO pack — meta, OG/Twitter cards, JSON-LD schema, favicon',
      html.includes('<title>') && html.includes('name="description"') && html.includes('property="og:title"') && html.includes('name="twitter:card"') && jsonOk && html.includes('rel="icon"'),
      jsonOk ? `JSON-LD parses; title/description/OG/Twitter/favicon present` : 'JSON-LD failed to parse'),
  ];
}

function testWcag(): TestResult[] {
  const fails: string[] = [];
  let tested = 0;
  for (let i = 0; i < 30; i++) {
    const p = buildPalette(seedFrom(`wcag-${i}`));
    tested++;
    for (const pair of p.report) {
      if (!pair.pass) fails.push(`seed ${i}: ${pair.pair} ${pair.ratio}:1 < ${pair.target}:1`);
    }
  }
  return [
    check('A4', 'A · Generator', 'WCAG contrast — every palette role passes its target (30 palettes)',
      fails.length === 0,
      fails.length === 0 ? `${tested} palettes × 4 roles all clear (ink≥7:1, soft≥4.5:1, accent≥3:1, onAccent≥4.5:1)` : `${fails.length} failures, first: ${fails[0]}`),
  ];
}

function testDarkMode(): TestResult[] {
  let adaptive = 0;
  let nativeDark = 0;
  const fails: string[] = [];
  for (let i = 0; i < 24; i++) {
    const r = renderSite(`dark-${i}`, 'T Owner');
    if (r.palette.theme === 'dark') {
      nativeDark++;
      if (!r.html.includes('color-scheme:dark') || !r.html.includes('content="dark"')) fails.push(`seed ${i}: native dark missing color-scheme`);
    } else {
      adaptive++;
      if (!r.html.includes('@media (prefers-color-scheme:dark)')) fails.push(`seed ${i}: no dark media block`);
      if (!r.html.includes('content="light dark"')) fails.push(`seed ${i}: no color-scheme meta`);
      const dr = r.darkReport ?? [];
      if (dr.length !== 4) fails.push(`seed ${i}: dark report incomplete (${dr.length}/4)`);
      for (const pair of dr) if (!pair.pass) fails.push(`seed ${i}: ${pair.pair} ${pair.ratio}:1`);
    }
  }
  return [
    check('A5', 'A · Generator', 'Dark mode — prefers-color-scheme with re-derived, WCAG-verified tokens',
      fails.length === 0 && adaptive > 0 && nativeDark > 0,
      fails.length === 0 ? `${adaptive} adaptive sites carry the dark block + passed dark contrast; ${nativeDark} natively-dark sites verified` : `failures: ${fails.slice(0, 3).join('; ')}`),
  ];
}

function testCopyright(): TestResult[] {
  const r = renderSite('copyright-seed', 'Test Owner');
  const hasStamp = r.html.includes(`© <span class="stamp">${YEAR}</span> Test Owner. All rights reserved.`);
  const hasJs = r.html.includes("new Date().getFullYear()");
  const support = renderSupportFiles('copyright-seed', 'Test Owner', { price: 500, copyright: `© ${YEAR} Test Owner. All rights reserved.` });
  const notesOk = support['DESIGN-NOTES.md'].includes(`© ${YEAR} Test Owner`);
  const zipLine = support['robots.txt'].length > 0;
  return [
    check('A6', 'A · Generator', '© + year injected — page stamp, live-year JS, design notes',
      hasStamp && hasJs && notesOk && zipLine,
      hasStamp ? `footer stamp "© ${YEAR} Test Owner" + auto-year JS + DESIGN-NOTES.md copyright present` : 'stamp missing'),
  ];
}

function testUniqueness(): TestResult[] {
  const hashes = new Set<string>();
  let relative = true;
  for (let i = 0; i < 25; i++) {
    const r = renderSite(`universe-${i}`, 'T Owner');
    hashes.add(crypto.createHash('sha1').update(r.html).digest('hex'));
    if (!r.html.includes('clamp(') || !r.html.includes('1fr')) relative = false;
  }
  const dupes = 25 - hashes.size;
  return [
    check('A7', 'A · Generator', 'Infinite possible sites — 25 seeds, 25 unique builds, all relative-unit',
      dupes === 0 && relative,
      dupes === 0 ? `25/25 unique SHA-1s; fluid type + fr grids everywhere` : `${dupes} duplicate builds!`),
  ];
}

function testMotifs(): TestResult[] {
  const probes: Record<string, string> = {
    grain: 'background-size:22px 22px',
    blobs: 'radial-gradient(600px 400px at 12% 8%',
    grid: 'background-size:56px 56px',
    rings: 'repeating-radial-gradient(circle at 85% 10%',
    waves: 'repeating-linear-gradient(115deg',
    dots: 'background-size:26px 26px',
    arc: 'radial-gradient(120% 90% at 50% -20%',
  };
  const fails: string[] = [];
  for (const [motif, needle] of Object.entries(probes)) {
    let found = false;
    for (let i = 0; i < 60 && !found; i++) {
      const r = renderSite(`motif-${motif}-${i}`, 'T Owner');
      if (r.design.motif === motif) found = r.html.includes(needle);
    }
    if (!found) fails.push(motif);
  }
  return [
    check('A8', 'A · Generator', 'Ambient motifs painted into CSS (all 7 variants wired)',
      fails.length === 0,
      fails.length === 0 ? 'grain/blobs/grid/rings/waves/dots/arc all render their layer' : `unwired: ${fails.join(', ')}`),
  ];
}

function testA11y(): TestResult[] {
  const r = renderSite('a11y-seed', 'T Owner');
  const html = r.html;
  const marks = ['min-height:44px', ':focus-visible', 'aria-label="Open menu"', 'aria-expanded', 'prefers-reduced-motion', 'aria-hidden'];
  const missing = marks.filter((m) => !html.includes(m));
  // every <img> (if any) must carry alt — currently visuals are decorative gradients, so zero imgs is fine
  const imgsOk = !/<img(?![^>]*\balt=)/.test(html);
  return [
    check('A9', 'A · Generator', 'Accessibility floor — 44px targets, focus rings, reduced motion, aria, img alts',
      missing.length === 0 && imgsOk,
      missing.length === 0 && imgsOk ? 'touch targets, focus-visible, reduced-motion, aria labels, no untagged imgs' : `missing: ${missing.join(', ')}${imgsOk ? '' : ' · untagged <img>'}`),
  ];
}

/* ============ GROUP B · Design knowledge ============ */

function testKnowledge(): TestResult[] {
  const layoutOk = LAYOUTS.length === 12 && LAYOUTS.every((l) => l.spec && l.source.length > 10 && l.crap && l.mobile.length > 5 && l.sectionOrder.length >= 3);
  const devicesOk = DEVICE_CLASSES.length === 5 && DEVICE_CLASSES.map((d) => d.featureCols).join('') === '12345' && new Set(DEVICE_CLASSES.map((d) => d.previewWidth)).size === 5;
  const booksOk = LIBRARY.length === 12 && LIBRARY.every((b) => b.doctrine.length >= 2 && b.rules.length >= 2 && !!b.author && !!b.year);
  const phasesOk = STAGES.length === 7 && new Set(STAGES.map((s) => s.key)).size === 7;
  return [
    check('B1', 'B · Design knowledge', 'The Layout Book — 12 fully specified, sourced page layouts',
      layoutOk, `${LAYOUTS.length}/12 patterns, each with geometry spec + citable source + C.R.A.P. mapping`),
    check('B2', 'B · Design knowledge', 'Device law — D1–D5 classes, strictly increasing column ladder',
      devicesOk, `feature columns ${DEVICE_CLASSES.map((d) => d.featureCols).join('→')} · previews ${DEVICE_CLASSES.map((d) => d.previewWidth).join('→')}px`),
    check('B3', 'B · Design knowledge', 'The 12-book education — doctrine + machine rules per book',
      booksOk, `${LIBRARY.length}/12 books, every one carrying doctrine + executable rules`),
    check('B4', 'B · Design knowledge', 'Stage law — 7 deliberate stages, one per work day, no rushing',
      phasesOk, STAGES.map((s) => s.label).join(' → ')),
  ];
}

/* ============ GROUP C · Engine (sandboxed) ============ */

async function testEngine(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const prevDir = process.env.BEAST_DATA_DIR;
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'beast-selftest-'));
  process.env.BEAST_DATA_DIR = sandbox;
  try {
    const engine = await import('./engine');

    // -- lifecycle: 9 work days on a fresh sandbox -------------------------
    const state = { day: 0, lastRealTick: null, owner: 'Test Owner', sites: [], log: [] } as Parameters<typeof engine.runWorkDay>[0];
    for (let d = 1; d <= 9; d++) engine.runWorkDay(state, `2036-01-${String(d).padStart(2, '0')}`);
    const shipped = state.sites.filter((s) => s.status === 'for-sale');
    const inStudio = state.sites.filter((s) => s.status === 'in-studio');
    const first = shipped[0];
    const files = first ? fs.readdirSync(path.join(sandbox, 'sites', first.id)) : [];
    const expected = ['index.html', 'sitemap.xml', 'robots.txt', '404.html', 'DESIGN-NOTES.md'];
    const missingFiles = expected.filter((f) => !files.includes(f));
    results.push(check('C1', 'C · Engine (sandboxed)', 'Daily pipeline — one stage per day, 3 parallel commissions, no rushing',
      state.day === 9 && inStudio.length === engine.CONCURRENCY && shipped.length >= 1,
      `9 days run → ${shipped.length} shipped, ${inStudio.length}/${engine.CONCURRENCY} in studio, day counter = ${state.day}`));
    results.push(check('C1b', 'C · Engine (sandboxed)', 'Shipped site — price set, © stamped, all 5 files on disk',
      !!first && first.price > 0 && first.copyright.includes('Test Owner') && first.copyright.includes(String(YEAR)) && missingFiles.length === 0,
      first ? `${first.brand} at $${first.price} · files: ${files.join(', ') || 'none'}` : 'nothing shipped in 9 days'));

    // -- QA record ----------------------------------------------------------
    const qa = first?.qa;
    const qaOk = !!qa && qa.contrast.every((c) => c.pass) && qa.breakpoints.length === 4 && qa.crap.length === 5 && (qa.dark === undefined || qa.dark.every((d) => d.pass));
    results.push(check('C2', 'C · Engine (sandboxed)', 'QA record — CRAP audit + 4 breakpoints + dark pairs stored per site',
      qaOk, qa ? `contrast ${qa.contrast.filter((c) => c.pass).length}/${qa.contrast.length} pass · breakpoints ${qa.breakpoints.length}/4 · ${qa.crap.length} CRAP lines · dark pairs: ${qa.dark?.length ?? 'native'}` : 'no QA record'));

    // -- ZIP integrity -------------------------------------------------------
    const buf = await engine.zipSite(state, first.id);
    let zipOk = false;
    let zipDetail = 'zip null';
    if (buf) {
      const z = await JSZip.loadAsync(buf);
      const names = Object.keys(z.files);
      const need = ['index.html', 'LICENSE.txt', 'README.txt', 'sitemap.xml', 'robots.txt', '404.html', 'DESIGN-NOTES.md'];
      const missingZip = need.filter((n) => !names.includes(n));
      const license = await z.file('LICENSE.txt')!.async('string');
      zipOk = missingZip.length === 0 && license.includes('Test Owner') && license.includes(String(YEAR));
      zipDetail = missingZip.length === 0 ? `7 files in zip · LICENSE carries © ${YEAR} Test Owner` : `missing in zip: ${missingZip.join(', ')}`;
    }
    results.push(check('C3', 'C · Engine (sandboxed)', 'Per-site ZIP — index + support pack + LICENSE (© inside)',
      zipOk, zipDetail));

    const allBuf = await engine.zipAll(state);
    let allOk = false;
    let allDetail = 'zip null';
    if (allBuf) {
      const z = await JSZip.loadAsync(allBuf);
      const names = Object.keys(z.files).filter((n) => !n.endsWith('/'));
      const hasCatalog = names.includes('catalog.txt');
      const siteFolders = names.filter((n) => n.endsWith('/index.html')).length;
      const catalog = await z.file('catalog.txt')!.async('string');
      allOk = hasCatalog && siteFolders >= 1 && catalog.includes('©');
      allDetail = `${names.length} entries · ${siteFolders} site folders · catalog.txt carries © lines`;
    }
    results.push(check('C4', 'C · Engine (sandboxed)', 'Download-all ZIP — every site folder + catalog',
      allOk, allDetail));

    // -- day catch-up (tick) -----------------------------------------------
    const lagging = { day: 5, lastRealTick: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), owner: 'Test Owner', sites: [], log: [] } as Parameters<typeof engine.tick>[0];
    const ran = engine.tick(lagging);
    const ranAgain = engine.tick(lagging);
    results.push(check('C5', 'C · Engine (sandboxed)', 'Day catch-up — missed real days replayed on wake-up, then idles',
      ran.length === 3 && ranAgain.length === 0 && lagging.day === 8,
      `3 missed days → replayed ${ran.length} work days (day counter 5→${lagging.day}); second tick idle: ${ranAgain.length === 0}`));

    // -- owner / delete / clear ---------------------------------------------
    engine.setOwner(lagging, 'Renamed Owner');
    const ownerOk = lagging.owner === 'Renamed Owner';
    const before = lagging.sites.length;
    const delTarget = lagging.sites[0]?.id;
    const deleted = delTarget ? engine.deleteSite(lagging, delTarget) : false;
    const afterDelete = lagging.sites.length;
    engine.clearWorkspace(lagging);
    const ownDirsLeft = lagging.sites.filter((s) => fs.existsSync(path.join(sandbox, 'sites', s.id))).length;
    results.push(check('C6', 'C · Engine (sandboxed)', 'Workspace ops — owner rename, single delete, clear-all wipes own sites',
      ownerOk && deleted && afterDelete === before - 1 && lagging.sites.length === 0 && ownDirsLeft === 0,
      `owner → "Renamed Owner" · deleted 1 of ${before} · clear → 0 sites, 0 of its own dirs left on disk`));
  } finally {
    if (prevDir === undefined) delete process.env.BEAST_DATA_DIR;
    else process.env.BEAST_DATA_DIR = prevDir;
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  return results;
}

/* ============ runner ============ */

export async function runSelfTest(): Promise<{ results: TestResult[]; passCount: number; failCount: number; durationMs: number }> {
  const t0 = Date.now();
  // niche grammar sanity (part of B)
  const nichesOk = NICHES.length >= 12 && NICHES.every((n) => n.services.length === 6 && n.faq.length === 2 && n.quotes.length === 2);
  const results: TestResult[] = [
    ...testDeterminism(),
    ...testDeviceBreakpoints(),
    ...testStructure(),
    ...testWcag(),
    ...testDarkMode(),
    ...testCopyright(),
    ...testUniqueness(),
    ...testMotifs(),
    ...testA11y(),
    ...testKnowledge(),
    check('B5', 'B · Design knowledge', 'Niche grammar — 12 niches × 6 services × 2 FAQs × 2 quotes each',
      nichesOk, `${NICHES.length} niches verified`),
    ...(await testEngine()),
  ];
  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.length - passCount;
  return { results, passCount, failCount, durationMs: Date.now() - t0 };
}
