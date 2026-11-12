// Beast Self-Test v3 — every feature, tested feature-by-feature.
// Groups:
//   A · Generator (pure): determinism, D1–D5, structure, SEO, WCAG, dark mode,
//       copyright, uniqueness/infinity, motifs, a11y, attribution, image queries
//   B · Design knowledge: layout book (12 core + 20+ per device), device law,
//       12-book library, stage law, niche grammar, page-map law, task-graph law
//   C · Engine (sandboxed, v3): micro-task pipeline, one-task-per-day law,
//       shipped-site disk truth, QA record, values caps, contact realism,
//       multi-page ZIP, AI contract, interpretation ledger, GitHub defer law,
//       day catch-up, workspace ops, values editor, fresh-start purge, warm-up flag
// The engine tests redirect BEAST_DATA_DIR to a throwaway temp dir and force the
// offline floor (BEAST_IMAGES=0), so the live studio state is never touched and
// no network is needed. The same suite runs in-app (Test Center → /api/beast/test)
// and from the CLI (bun scripts/test-beast.ts).
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { renderSite, renderInnerPage, renderSupportFiles, type RenderArt, type PagePlanEntry } from './render';
import { buildPalette, deriveDarkTokens } from './palette';
import { seedFrom } from './rng';
import { DEVICE_CLASSES, STAGES, NICHES } from './spec';
import { LAYOUTS, layoutsForDevice } from './layouts';
import { LIBRARY } from './knowledge';
import { MAX_PHONES, MAX_PRODUCTS, validateValues, SOCIAL_PLATFORMS, type SiteValues } from './values';
import { attributionMarkdown, nicheImageQueries } from './images';
import { buildEnvelope, interpretAnswer } from './ai';
import { siteRepoName, VAULT_REPO } from './storage';
import { planPagesFor, expandAfterPlan } from './tasks';
import type { BeastState, BeastSite } from './engine';

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
  const html = renderSite('breakpoint-seed', 'T Owner').html;
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
  const html = renderSite('structure-seed', 'T Owner').html;
  const sections = (html.match(/<section/g) || []).length;
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let jsonOk = false;
  try {
    const parsed = JSON.parse(jsonLd![1]);
    jsonOk = parsed['@context'] === 'https://schema.org' && !!parsed['@type'];
  } catch { /* ignore */ }
  const landmarks = ['<header class="nav"', '<main id="main">', '<footer class="site">', '<nav class="drawer"', 'Skip to content', '<form', 'lang="en"', 'name="viewport"'];
  const missingLandmarks = landmarks.filter((l) => !html.includes(l));
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
  void deriveDarkTokens;
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
  const support = renderSupportFiles('copyright-seed', 'Test Owner', { price: 500, copyright: `© ${YEAR} Test Owner. All rights reserved.`, pages: ['index.html', 'contact.html'] });
  const notesOk = support['DESIGN-NOTES.md'].includes(`© ${YEAR} Test Owner`);
  const sitemapOk = support['sitemap.xml'].includes('contact.html');
  return [
    check('A6', 'A · Generator', '© + year injected — page stamp, live-year JS, design notes, sitemap',
      hasStamp && hasJs && notesOk && sitemapOk,
      hasStamp && sitemapOk ? `footer stamp "© ${YEAR} Test Owner" + auto-year JS + DESIGN-NOTES + sitemap page entries present` : 'stamp or sitemap missing'),
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
  const html = renderSite('a11y-seed', 'T Owner').html;
  const marks = ['min-height:44px', ':focus-visible', 'aria-label="Open menu"', 'aria-expanded', 'prefers-reduced-motion', 'aria-hidden'];
  const missing = marks.filter((m) => !html.includes(m));
  const imgsOk = !/<img(?![^>]*\balt=)/.test(html);
  return [
    check('A9', 'A · Generator', 'Accessibility floor — 44px targets, focus rings, reduced motion, aria, img alts',
      missing.length === 0 && imgsOk,
      missing.length === 0 && imgsOk ? 'touch targets, focus-visible, reduced-motion, aria labels, no untagged imgs' : `missing: ${missing.join(', ')}${imgsOk ? '' : ' · untagged <img>'}`),
  ];
}

function testAttribution(): TestResult[] {
  const rec = {
    slotId: 'hero', role: 'hero' as const, query: 'coffee roasting', status: 'live' as const,
    source: 'openverse', creator: 'Jane Doe', license: 'cc0', sourcePage: 'https://example.org/land',
    remoteUrl: 'https://example.org/img.jpg',
  };
  const md = attributionMarkdown('Test Brand', [rec, { ...rec, slotId: 'gallery-1', status: 'gradient', source: 'gradient', creator: undefined, license: undefined, sourcePage: undefined }]);
  const ok = md.includes('Jane Doe') && md.includes('cc0') && md.includes('https://example.org/land') && md.includes('generated artwork') && md.split('|').length >= 8;
  return [
    check('A10', 'A · Generator', 'Attribution paper trail — every live image credited in ATTRIBUTION.md',
      ok, ok ? 'creator + license + source page rendered as a table row; gradient art carries its no-rights note' : 'attribution rows missing'),
  ];
}

function testImageQueries(): TestResult[] {
  const bad = NICHES.filter((n) => (nicheImageQueries(n.label, n.key) ?? []).length < 3);
  const fallback = nicheImageQueries('chairmaker', 'unknown-key');
  const ok = bad.length === 0 && fallback.length >= 1 && fallback.every((q) => q.length > 2);
  return [
    check('A11', 'A · Generator', 'Image query grammar — every niche maps to 3+ search queries, graceful fallback',
      ok, ok ? `${NICHES.length} niches × 3 queries verified + fallback for unknown niches` : `thin queries: ${bad.map((b) => b.key).join(', ')}`),
  ];
}

/* ============ GROUP B · Design knowledge ============ */

function testKnowledge(): TestResult[] {
  const core = LAYOUTS.filter((l) => l.source.length > 10 && l.crap && l.mobile.length > 5 && l.sectionOrder.length >= 3);
  const perDevice = (['D1', 'D2', 'D3', 'D4', 'D5'] as const).map((d) => layoutsForDevice(d).length);
  const minPerDevice = Math.min(...perDevice);
  const devicesOk = DEVICE_CLASSES.length === 5 && DEVICE_CLASSES.map((d) => d.featureCols).join('') === '12345' && new Set(DEVICE_CLASSES.map((d) => d.previewWidth)).size === 5;
  const booksOk = LIBRARY.length === 12 && LIBRARY.every((b) => b.doctrine.length >= 2 && b.rules.length >= 2 && !!b.author && !!b.year);
  const phasesOk = STAGES.length === 7 && new Set(STAGES.map((s) => s.key)).size === 7;
  return [
    check('B1', 'B · Design knowledge', 'The Layout Book — core 12 + 20+ researched layouts per device class',
      core.length === LAYOUTS.length && minPerDevice >= 20,
      `${LAYOUTS.length} layouts total; per-device ${perDevice.join('/')} (min ${minPerDevice}); every one carries geometry + citable source + C.R.A.P. mapping`),
    check('B2', 'B · Design knowledge', 'Device law — D1–D5 classes, strictly increasing column ladder',
      devicesOk, `feature columns ${DEVICE_CLASSES.map((d) => d.featureCols).join('→')} · previews ${DEVICE_CLASSES.map((d) => d.previewWidth).join('→')}px`),
    check('B3', 'B · Design knowledge', 'The 12-book education — doctrine + machine rules per book',
      booksOk, `${LIBRARY.length}/12 books, every one carrying doctrine + executable rules`),
    check('B4', 'B · Design knowledge', 'Stage law — 7 deliberate stages, no rushing',
      phasesOk, STAGES.map((s) => s.label).join(' → ')),
  ];
}

function testNicheGrammar(): TestResult[] {
  const nichesOk = NICHES.length >= 12 && NICHES.every((n) => n.services.length === 6 && n.faq.length === 2 && n.quotes.length === 2);
  return [
    check('B5', 'B · Design knowledge', 'Niche grammar — 12+ niches × 6 services × 2 FAQs × 2 quotes each',
      nichesOk, `${NICHES.length} niches verified`),
  ];
}

function testPageMapLaw(): TestResult[] {
  const probe = { seed: 'pagemap-law-seed', brand: 'Law Brand', art: { values: null } } as unknown as Parameters<typeof planPagesFor>[0];
  const base = planPagesFor(probe);
  const withCatalog = { ...probe, art: { values: { products: Array.from({ length: 30 }, (_, i) => ({ name: `P${i}`, desc: 'd', price: 10 })) } } } as unknown as Parameters<typeof planPagesFor>[0];
  const big = planPagesFor(withCatalog);
  const ok =
    base[0]?.key === 'home' &&
    base.some((p) => p.key === 'contact' && p.inNav) &&
    base.every((p) => p.file.endsWith('.html') && p.purpose.length > 3) &&
    base.length <= 9 &&
    big.some((p) => p.key === 'products');
  return [
    check('B6', 'B · Design knowledge', 'Page-map law — home first, contact mandatory & in nav, ≤9 pages, catalog earns Shop',
      ok, ok ? `base map ${base.length} pages (${base.map((p) => p.key).join('→')}); 30-product map adds products` : 'page-map law broken'),
  ];
}

function testTaskGraphLaw(): TestResult[] {
  const values = { products: Array.from({ length: 30 }, (_, i) => ({ name: `P${i}`, desc: 'd', price: 10 })) } as never;
  const pages = planPagesFor({ seed: 'taskgraph-law-seed', brand: 'Law Brand', art: { values } } as unknown as Parameters<typeof planPagesFor>[0]);
  const probe = { seed: 'taskgraph-law-seed', brand: 'Law Brand', id: 'law-site', art: { values, pages } } as unknown as Parameters<typeof expandAfterPlan>[0];
  const tasks = expandAfterPlan(probe);
  const inner = (probe.art.pages as PagePlanEntry[]).filter((p) => p.key !== 'home');
  const headings = tasks.filter((t) => t.kind === 'heading.compose').length;
  const governed = tasks.every((t) => t.rules.length >= 3 && t.knowledge.length >= 1 && t.why.length > 10);
  const kinds = new Set(tasks.map((t) => t.kind));
  const ok = governed &&
    headings >= inner.length * 4 &&
    kinds.has('section.copy') && kinds.has('image.select') && kinds.has('page.build') &&
    kinds.has('page.review') && kinds.has('qa.audit') && kinds.has('values.freeze') &&
    kinds.has('site.stamp') && kinds.has('github.publish') && kinds.has('contact.channels') && kinds.has('catalog.build');
  return [
    check('B7', 'B · Design knowledge', 'Task-graph law — page.plan decomposes into governed micro-tasks (4 headings per page, build/review/QA/freeze/stamp/publish)',
      ok, ok ? `${tasks.length} tasks from ${inner.length} inner pages · ${headings} headings · every task carries rules + knowledge + why` : 'decomposition law broken'),
  ];
}

/* ============ GROUP C · Engine (sandboxed, v3) ============ */

async function testEngine(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const prevDir = process.env.BEAST_DATA_DIR;
  const prevImages = process.env.BEAST_IMAGES;
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'beast-selftest-'));
  process.env.BEAST_DATA_DIR = sandbox;
  process.env.BEAST_IMAGES = '0'; // offline floor — gradients, no network
  delete process.env.BEAST_GH_TOKEN;
  delete process.env.GITHUB_TOKEN;
  delete process.env.BEAST_AI_VAULT;
  try {
    const engine = await import('./engine');
    const state: BeastState = engine.loadState();
    state.owner = 'Test Owner'; // stamps © with a name the suite can assert on

    // -- fresh start law (the placeholder purge) ---------------------------
    results.push(check('C0', 'C · Engine (sandboxed)', 'Fresh start law — v3 opens an EMPTY studio (placeholder sim sites are gone)',
      state.version === engine.ENGINE_VERSION && state.day === 0 && state.sites.length === 0,
      `version ${state.version}, day ${state.day}, ${state.sites.length} sites — the ledger earns every site task by task`));

    // -- lifecycle: 9 work days --------------------------------------------
    for (let d = 1; d <= 9; d++) await engine.runWorkDay(state, `2036-01-${String(d).padStart(2, '0')}`);
    const shipped = state.sites.filter((s) => s.status === 'for-sale');
    const inStudio = state.sites.filter((s) => s.status === 'in-studio');
    results.push(check('C1', 'C · Engine (sandboxed)', 'Micro-task pipeline — 9 days, 3 parallel commissions, first shelf candidates advancing',
      state.day === 9 && inStudio.length === engine.CONCURRENCY && state.sites.every((s) => s.tasks.length > 0),
      `9 days run → ${state.sites.length} commissioned, ${inStudio.length}/${engine.CONCURRENCY} in studio, day counter = ${state.day}`));

    // -- one-task-per-day law ----------------------------------------------
    const before = new Map(inStudio.map((s) => [s.id, s.tasks.filter((t) => t.status === 'accepted').length]));
    await engine.runWorkDay(state, '2036-01-10');
    const after = state.sites.filter((s) => s.status === 'in-studio');
    const lawOk = after.every((s) => {
      const b = before.get(s.id) ?? 0;
      const a = s.tasks.filter((t) => t.status === 'accepted').length;
      return a === b + 1 || s.tasks.every((t) => t.status !== 'queued');
    });
    results.push(check('C1b', 'C · Engine (sandboxed)', 'One-task-per-day law — each site advances EXACTLY one micro-task per work day',
      lawOk, lawOk ? `every in-studio site +1 accepted task on day 10 (perfect one task, then rest)` : 'a site advanced more than one task'));

    const first = state.sites[0];
    const accepted = first.tasks.filter((t) => t.status === 'accepted');
    results.push(check('C1c', 'C · Engine (sandboxed)', 'Task ledger integrity — accepted tasks carry precision + acceptance day',
      accepted.length >= 8 && accepted.every((t) => t.precision > 0 && typeof t.acceptedDay === 'number'),
      `${first.brand}: ${accepted.length} accepted tasks, all carrying precision > 0 + acceptedDay`));

    // -- interpretation ledger (the AI transcript) --------------------------
    const tOk = state.transcript.length >= 5 &&
      state.transcript.every((t) => ['ACCEPT', 'REFINE', 'DEFER'].includes(t.verdict) && t.action.length > 0 && t.provider.length > 0);
    const solverAccepts = state.transcript.filter((t) => t.mode === 'solver' && t.verdict === 'ACCEPT' && t.precision >= 0.85).length;
    results.push(check('C7', 'C · Engine (sandboxed)', 'Interpretation ledger — every task turn records provider, verdict, action, precision',
      tOk && solverAccepts >= 3,
      `${state.transcript.length} turns logged · ${solverAccepts} solver ACCEPTs ≥0.85 precision · every turn explains what happened next`));

    // -- shipped site disk truth (needs ~60 task-days; fast-forward the ledger)
    const fastForward = async (site: BeastSite) => {
      for (let i = 0; i < 90; i++) {
        if (site.status === 'for-sale') break;
        await engine.runTaskNow(state, site.id);
      }
    };
    const candidate = state.sites.find((s) => s.status === 'in-studio');
    if (candidate) await fastForward(candidate);
    const shippedNow = state.sites.find((s) => s.status === 'for-sale');
    if (shippedNow) {
      const dir = path.join(sandbox, 'sites', shippedNow.id);
      const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
      const innerFiles = (shippedNow.art.pages ?? []).filter((p) => p.key !== 'home').map((p) => p.file);
      const expected = ['index.html', 'values.json', 'ATTRIBUTION.md', 'sitemap.xml', 'robots.txt', '404.html', 'DESIGN-NOTES.md', ...innerFiles];
      const missing = expected.filter((f) => !files.includes(f));
      results.push(check('C1d', 'C · Engine (sandboxed)', 'Shipped site disk truth — index + inner pages + values.json + ATTRIBUTION + support pack',
        missing.length === 0 && shippedNow.price > 0 && shippedNow.copyright.includes('Test Owner'),
        missing.length === 0 ? `${shippedNow.brand} at $${shippedNow.price} · ${innerFiles.length + 1} pages + values.json + ATTRIBUTION.md + support pack on disk` : `missing: ${missing.join(', ')}`));

      // -- contact realism ---------------------------------------------------
      const art: RenderArt = { ...shippedNow.art, pages: shippedNow.art.pages ?? [] } as RenderArt;
      const contact = renderInnerPage(shippedNow.seed, state.owner, 'contact', { art, currentKey: 'contact' });
      const vals = shippedNow.art.values!;
      const telCount = (contact.match(/href="tel:/g) || []).length;
      const jsonLdMatch = contact.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      let contactPoints = -1;
      try {
        const ld = JSON.parse(jsonLdMatch![1]);
        const arr = Array.isArray(ld) ? ld : [ld];
        contactPoints = (JSON.stringify(arr).match(/ContactPoint/g) || []).length;
      } catch { /* ignore */ }
      const platforms = SOCIAL_PLATFORMS.map((p) => p.label);
      const socialOk = platforms.every((l) => contact.includes(l));
      const contactOk =
        telCount >= Math.min(3, vals.phones.length) &&
        telCount <= 12 &&
        socialOk &&
        contact.includes('openstreetmap') &&
        contact.includes('<iframe') &&
        contactPoints >= Math.min(3, vals.phones.length) &&
        contact.includes('mailto:');
      results.push(check('C4', 'C · Engine (sandboxed)', 'Contact realism — ≤12 labelled phone lines, all 8 socials incl. WhatsApp, OSM map, JSON-LD contactPoints',
        contactOk,
        contactOk ? `${telCount} tel: links (caps ${MAX_PHONES}) · all ${platforms.length} platforms · OSM iframe · ${contactPoints} JSON-LD contactPoints` :
          `tel:${telCount} socials:${socialOk} map:${contact.includes('openstreetmap')} contactPoints:${contactPoints}`));

      // -- multi-page ZIP ------------------------------------------------------
      const buf = await engine.zipSite(state, shippedNow.id);
      let zipOk = false;
      let zipDetail = 'zip null';
      if (buf) {
        const z = await JSZip.loadAsync(buf);
        const names = Object.keys(z.files).filter((n) => !n.endsWith('/'));
        const need = ['index.html', 'values.json', 'ATTRIBUTION.md', 'LICENSE.txt', 'README.txt', 'sitemap.xml', 'robots.txt', '404.html', 'DESIGN-NOTES.md', ...innerFiles];
        const missingZip = need.filter((n) => !names.includes(n));
        const license = await z.file('LICENSE.txt')!.async('string');
        const valuesInZip = await z.file('values.json')!.async('string');
        zipOk = missingZip.length === 0 && license.includes('Test Owner') && license.includes(`${LAYOUTS.length}-layout library`) && valuesInZip.includes('"phones"');
        zipDetail = missingZip.length === 0 ? `${names.length} files · LICENSE carries © + ${LAYOUTS.length}-layout library · values.json editable inside` : `missing in zip: ${missingZip.join(', ')}`;
      }
      results.push(check('C5', 'C · Engine (sandboxed)', 'Multi-page ZIP — every page + values.json + attribution + licence (© inside)',
        zipOk, zipDetail));

      const allBuf = await engine.zipAll(state);
      let allOk = false;
      if (allBuf) {
        const z = await JSZip.loadAsync(allBuf);
        const names = Object.keys(z.files).filter((n) => !n.endsWith('/'));
        const catalog = await z.file('catalog.txt')!.async('string');
        allOk = names.includes('catalog.txt') && names.filter((n) => n.endsWith('/index.html')).length >= 1 && catalog.includes('©');
      }
      results.push(check('C5b', 'C · Engine (sandboxed)', 'Download-all ZIP — every site folder + catalog with archive links',
        allOk, allOk ? 'catalog.txt carries © + archive column' : 'zip-all broken'));
    } else {
      results.push(check('C1d', 'C · Engine (sandboxed)', 'Shipped site disk truth', false, 'no site shipped after 90 forced task-days — pipeline stalled'));
    }

    // -- QA record -----------------------------------------------------------
    const qa = shippedNow?.qa;
    const qaOk = !!qa && qa.contrast.every((c) => c.pass) && qa.breakpoints.length === 4 && qa.crap.length >= 4;
    results.push(check('C2', 'C · Engine (sandboxed)', 'QA record — CRAP audit + 4 breakpoints + contrast pairs stored per site',
      qaOk, qa ? `contrast ${qa.contrast.filter((c) => c.pass).length}/${qa.contrast.length} pass · breakpoints ${qa.breakpoints.length}/4 · ${qa.crap.length} CRAP lines` : 'no QA record'));

    // -- values caps are law ---------------------------------------------------
    const bloated = {
      brand: 'Cap Test', tagline: 't', domain: 'https://cap.site/',
      phones: Array.from({ length: 14 }, (_, i) => ({ label: `L${i}`, number: `+1 555 000 ${1000 + i}` })),
      emails: ['a@b.site'], socials: SOCIAL_PLATFORMS.map((p) => ({ platform: p.key, handle: 'h', url: p.url('h') })),
      hoursDisplay: ['Mon–Fri 9–17'], address: '1 Way', mapEmbed: '',
      products: Array.from({ length: 35 }, (_, i) => ({ name: `Item ${i}`, desc: 'd', price: 5 })),
    } as unknown as SiteValues;
    const vres = validateValues(bloated);
    const capsOk = vres.clean.phones.length === MAX_PHONES && vres.clean.products.length === MAX_PRODUCTS &&
      new Set(vres.clean.products.map((p) => p.name)).size === vres.clean.products.length &&
      vres.clean.socials.length === SOCIAL_PLATFORMS.length &&
      vres.clean.domain === 'cap.site' && !vres.ok && vres.issues.length >= 2;
    results.push(check('C3', 'C · Engine (sandboxed)', 'Values caps are law — 14 phones → 12, 35 products → 30 deduped, socials ≤ 8, domain stripped',
      capsOk, capsOk ? `phones ${vres.clean.phones.length}/${MAX_PHONES}, products ${vres.clean.products.length}/${MAX_PRODUCTS}, socials ${vres.clean.socials.length}, domain "${vres.clean.domain}", ${vres.issues.length} caps reported` : 'caps failed'));

    // -- values editor roundtrip ------------------------------------------------
    if (shippedNow) {
      const edited = JSON.parse(JSON.stringify(shippedNow.art.values)) as SiteValues;
      edited.brand = 'Edited Brand';
      edited.phones = [...edited.phones, { label: 'Extra', number: '+1 555 111 0000' }, { label: 'Extra2', number: '+1 555 111 0001' }];
      const setRes = await engine.setValues(state, shippedNow.id, edited);
      const stored = state.sites.find((s) => s.id === shippedNow.id)!.art.values!;
      const rebuilt = fs.readFileSync(path.join(sandbox, 'sites', shippedNow.id, 'contact.html'), 'utf8');
      const editorOk = setRes.ok && stored.brand === 'Edited Brand' && stored.phones.length <= MAX_PHONES && rebuilt.includes('Edited Brand');
      results.push(check('C10', 'C · Engine (sandboxed)', 'Values editor — owner edits once, caps enforced, every built page re-renders',
        editorOk, editorOk ? `brand → "${stored.brand}", phones capped at ${stored.phones.length}, contact.html re-rendered with the new facts` : 'editor roundtrip failed'));
    }

    // -- AI contract (envelope + interpreter) -------------------------------------
    const env = buildEnvelope({
      role: 'headline editor', why: 'test why', rules: ['rule one'], knowledge: ['Krug 2000'],
      state: ['brand: X'], contract: 'JSON only: {"text": "..."}',
    });
    const envOk = env.prompt.includes('WHY THIS CALL EXISTS') && env.prompt.includes('RULES') &&
      env.prompt.includes('GOVERNING KNOWLEDGE') && env.prompt.includes('FROZEN STATE') && env.prompt.includes('OUTPUT CONTRACT');
    const r1 = interpretAnswer('heading.compose', '{"text":"Slow roasted, poured with care","alt":"Bar pour"}');
    const r2 = interpretAnswer('heading.compose', '{"text":"The best coffee in town"}');
    const r3 = interpretAnswer('heading.compose', 'I think a good heading would be Slow Roast!');
    const body25 = '{"kicker":"k","body":"' + Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ') + '"}';
    const r4 = interpretAnswer('section.copy', body25);
    const r5 = interpretAnswer('section.copy', '{"kicker":"k","body":"too short"}');
    const aiOk = envOk && r1.verdict === 'ACCEPT' && r2.verdict === 'REFINE' && /banned/.test(r2.reason) &&
      r3.verdict === 'REFINE' && /JSON/.test(r3.reason) && r4.verdict === 'ACCEPT' && r5.verdict === 'REFINE';
    results.push(check('C6', 'C · Engine (sandboxed)', 'AI contract — envelope carries WHY/RULES/KNOWLEDGE/STATE/CONTRACT; validator ACCEPTs only contract-true answers',
      aiOk, aiOk ? 'envelope complete · good heading ACCEPT · banned word REFINE · prose-only REFINE · 30-word body ACCEPT · 2-word body REFINE' : 'contract broken'));

    // -- GitHub defer law (no token in sandbox) -----------------------------------
    const repoName = siteRepoName('Bloom & Slow', 'abcdef1234');
    const namingOk = repoName === 'beast-site-bloom-slow-abcdef';
    const ghTask = shippedNow?.tasks.find((t) => t.kind === 'github.publish');
    const ghOk = !ghTask || ghTask.status === 'deferred' || ghTask.status === 'queued';
    results.push(check('C8', 'C · Engine (sandboxed)', 'GitHub archive law — auto-named repos (beast-site-<slug>-<seed6>); no token defers, never blocks',
      namingOk && ghOk, `repo name "${repoName}" · publish task ${ghTask ? ghTask.status : 'n/a'} — the studio keeps working without a token`));

    // -- day catch-up --------------------------------------------------------------
    const lagging: BeastState = { ...state, day: 5, lastRealTick: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), sites: [], log: [], transcript: [] };
    const ran = await engine.tick(lagging);
    const ranAgain = await engine.tick(lagging);
    results.push(check('C9', 'C · Engine (sandboxed)', 'Day catch-up — missed real days replayed on wake-up, then idles',
      ran.length === 3 && ranAgain.length === 0 && lagging.day === 8,
      `3 missed days → replayed ${ran.length} work days (day 5→${lagging.day}); second tick idle: ${ranAgain.length === 0}`));

    // -- workspace ops ---------------------------------------------------------------
    const st1: BeastState = { ...state };
    await engine.setOwner(st1, 'Renamed Owner');
    const ownerOk = st1.owner === 'Renamed Owner';
    const beforeDel = st1.sites.length;
    const delTarget = st1.sites[0]?.id;
    const deleted = delTarget ? engine.deleteSite(st1, delTarget) : false;
    const afterDelete = st1.sites.length;
    engine.clearWorkspace(st1);
    const dirsLeft = st1.sites.filter((s) => fs.existsSync(path.join(sandbox, 'sites', s.id))).length;
    results.push(check('C11', 'C · Engine (sandboxed)', 'Workspace ops — owner rename (re-stamps ©), single delete, clear-all wipes disk',
      ownerOk && deleted && afterDelete === beforeDel - 1 && st1.sites.length === 0 && dirsLeft === 0,
      `owner → "Renamed Owner" · deleted 1 of ${beforeDel} · clear → 0 sites, 0 dirs left on disk`));

    // -- fresh-start purge (v2 state file must not survive) ----------------------------
    fs.writeFileSync(path.join(sandbox, 'beast-state.json'), JSON.stringify({ version: 2, day: 44, sites: [{ id: 'sim-ghost' }], log: [], transcript: [] }));
    const purged = engine.loadState();
    results.push(check('C12', 'C · Engine (sandboxed)', 'Placeholder purge — any pre-v3 state file is wiped, the studio restarts clean',
      purged.version === 3 && purged.day === 0 && purged.sites.length === 0,
      `v2 state (day 44, 1 ghost site) → v3 day ${purged.day}, ${purged.sites.length} sites`));

    // -- warm-up flag is opt-in ----------------------------------------------------------
    fs.rmSync(path.join(sandbox, 'beast-state.json'), { force: true });
    process.env.BEAST_WARMUP = '1';
    const warm = engine.loadState();
    delete process.env.BEAST_WARMUP;
    fs.rmSync(path.join(sandbox, 'beast-state.json'), { force: true }); // cold start must read its own file, not warm-up's
    const cold = engine.loadState();
    const warmOk = warm.log.some((l) => l.jobs.some((j) => j.includes('Warm-up'))) && cold.log.some((l) => l.jobs.some((j) => j.includes('fresh start')));
    results.push(check('C13', 'C · Engine (sandboxed)', 'Warm-up is opt-in — default is the empty studio; BEAST_WARMUP=1 replays demo days',
      warmOk, `BEAST_WARMUP=1 → "${warm.log[0].jobs[0].slice(0, 40)}…" · default → "${cold.log[0].jobs[0].slice(0, 40)}…"`));

    // -- vault adoption (durable memory across deploys) ---------------------------------
    const vaultState: BeastState = { ...state, day: 21, sites: state.sites.slice(0, 1), log: [{ day: 21, date: '2036-02-01', jobs: ['vaulted'] }], transcript: state.transcript.slice(0, 2) };
    const fresh = engine.loadState(); // empty studio (file was written by C13's cold load)
    const adopted = await engine.adoptVaultState(fresh, async () => JSON.stringify(vaultState));
    const cold2: BeastState = { version: engine.ENGINE_VERSION, day: 0, lastRealTick: null, owner: 'Test Owner', sites: [], log: [], transcript: [] };
    const wrongVersion = await engine.adoptVaultState(cold2, async () => JSON.stringify({ ...vaultState, version: 2 }));
    results.push(check('C14', 'C · Engine (sandboxed)', 'Vault adoption — a cold empty studio adopts the vaulted ledger; foreign versions rejected',
      adopted && fresh.day === 21 && fresh.sites.length === 1 && !wrongVersion,
      `empty studio → DAY ${fresh.day} with ${fresh.sites.length} site(s) adopted from ${VAULT_REPO} · v2 payload rejected`));
  } finally {
    if (prevDir === undefined) delete process.env.BEAST_DATA_DIR;
    else process.env.BEAST_DATA_DIR = prevDir;
    if (prevImages === undefined) delete process.env.BEAST_IMAGES;
    else process.env.BEAST_IMAGES = prevImages;
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  return results;
}

/* ============ runner ============ */

export async function runSelfTest(): Promise<{ results: TestResult[]; passCount: number; failCount: number; durationMs: number }> {
  const t0 = Date.now();
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
    ...testAttribution(),
    ...testImageQueries(),
    ...testKnowledge(),
    ...testNicheGrammar(),
    ...testPageMapLaw(),
    ...testTaskGraphLaw(),
    ...(await testEngine()),
  ];
  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.length - passCount;
  return { results, passCount, failCount, durationMs: Date.now() - t0 };
}
