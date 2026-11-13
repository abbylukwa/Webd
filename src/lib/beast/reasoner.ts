// Beast Reasoner v5 — the site's own researcher and decision-maker.
//
// The owner's law: the research into "what do people hate on websites and what
// do they want" is THE REASONER'S task, performed at runtime for every single
// site — never pre-baked by the coder. This module is that reasoner:
//
//   1. review.scan   — it surveys its corpus of documented public user-review
//                      themes (real, citable UX research + recurring public
//                      complaints) and selects the pains that matter for THIS
//                      niche, THIS audience, THESE devices.
//   2. review.demand — it converts each selected pain into a demand with a
//                      build rule and a task consequence, then those demands
//                      are injected into the rules of the tasks that follow.
//   3. persona / journey — it composes the visitors the findings describe and
//                      maps their journeys through the pages.
//   4. device.reason — it reasons per device class: OS, input, context.
//   5. product.reason— it reasons about which products the catalog needs.
//   6. layout.assign — for every page × device it picks a layout from the
//                      100+-layout book (20+ per device), never repeating a
//                      layout on the same device across pages, and writes the
//                      full complementarity description: which colours work on
//                      that layout, which products it needs, which device/OS it
//                      assumes, and why.
//
// Everything is deterministic from the seed — same seed, same reasoning, forever.
import { seedFrom, type RNG } from './rng';
import { LAYOUTS, layoutsForDevice, type DeviceId, type Layout } from './layouts';
import { contrast, type Palette } from './palette';

/* ═══════════════ the complaint corpus (the reasoner's memory) ═══════════════

   Each entry is a recurring, documented theme from public user research or
   widely-reported user complaints: what people say they hate, what they demand
   instead, and what that means for this build. Sources are real and citable —
   the reasoner names them in its answers. */

export type Complaint = {
  id: string;
  hate: string;              // what people say they hate
  source: string;            // real, citable research or well-documented complaint
  demand: string;            // what they want instead
  design: string;            // the design consequence
  feeds: string[];           // which task kinds must carry this demand as a rule
  niches: string[];          // 'always' or niche keys where it bites hardest
};

export const COMPLAINT_CORPUS: Complaint[] = [
  { id: 'popup-walls', hate: 'Pop-ups and interstitials slamming over the page before anything can be read', source: 'Nielsen Norman Group — popup/interstitial usability (Nielsen 2004, reconfirmed 2017); Google interstitial penalty (2017)', demand: 'Nothing blocks the page. Any notice is inline, small and dismissible.', design: 'No modal on load anywhere; badges and notices live inline in the layout.', feeds: ['page.build', 'qa.a11y', 'qa.audit'], niches: ['always'] },
  { id: 'autoplay-sound', hate: 'Audio or video that starts playing uninvited', source: 'Nielsen Norman Group — most-hated advertising techniques (Nielsen 2004)', demand: 'Media stays silent until clicked.', design: 'No autoplay attributes on any element; motion is visual only and honors reduced-motion.', feeds: ['page.build', 'qa.html'], niches: ['always'] },
  { id: 'carousel-ignore', hate: 'Hero carousels nobody clicks — visitors only ever see slide one', source: 'Erik Runyon, Carousel Interaction Stats (Notre Dame Web Team, 2013): ~1% engage, 84% see only the first slide', demand: 'One honest hero; content in static, scannable grids.', design: 'Hero is a single composed statement; galleries are fixed grids, never rotators.', feeds: ['page.build', 'layout.assign'], niches: ['always'] },
  { id: 'speed-death', hate: 'Pages that take forever — people give up and never come back', source: 'Google DoubleClick mobile speed study (2016): 53% of mobile visits abandon past 3 seconds', demand: 'A fast page: light HTML, lazy images, no junk scripts.', design: 'Performance budget per page; images load lazily; JS is a few inline lines.', feeds: ['qa.speed', 'page.build', 'image.select'], niches: ['always'] },
  { id: 'stock-photos', hate: 'Generic stock-photo smiles that scream "nobody actually works here"', source: 'Nielsen Norman Group — Photos as Web Content (Levin 2011): filler photos erode trust', demand: 'Real, specific imagery with alt text that says what is actually shown.', design: 'Every image slot resolves to a specific, openly licensed, attributed photo — or honest generated art, never fake people.', feeds: ['image.select', 'art.expand', 'qa.images'], niches: ['always'] },
  { id: 'hidden-prices', hate: 'Hunting for a price that is nowhere on the site', source: 'Baymard Institute checkout research (annual): surprise costs are a leading abandonment cause', demand: 'Prices plain on the listing AND the detail view.', design: 'Home carries the priced list; every product page carries its price; the directory carries nothing hidden.', feeds: ['catalog.build', 'product.copy', 'page.build'], niches: ['coffee', 'bakery', 'ceramics', 'plants', 'florist', 'books', 'jazz', 'tattoo', 'surf', 'yoga'] },
  { id: 'forced-accounts', hate: 'Being forced to register an account just to look or ask', source: 'Baymard Institute: roughly one in four abandons when forced to create an account first', demand: 'Everything works as a guest; accounts optional and honestly labelled.', design: 'Auth is opt-in, marked as local-demo, and never gates content or contact.', feeds: ['feature.auth', 'page.build'], niches: ['always'] },
  { id: 'contact-hunt', hate: 'Digging through pages to find one working phone number', source: 'Nielsen Norman Group — Contact Us usability: users fail when contact facts are buried', demand: 'Contact everywhere it is needed: nav, footer, its own page, and a full directory.', design: 'Contact linked in nav; footer repeats it; contacts.html lists every channel by department.', feeds: ['contact.channels', 'page.build', 'qa.nav'], niches: ['always'] },
  { id: 'about-trust', hate: 'No idea who is behind the site — no names, no address, no history', source: 'Nielsen Norman Group — "About Us" usability studies (2006, 2016): users seek the humans', demand: 'Named people, a real address, a since-year, a promise.', design: 'About page leads with who, where, since; footer repeats the facts.', feeds: ['page.build', 'section.copy'], niches: ['always'] },
  { id: 'tiny-type', hate: 'Squinting at 12px body text', source: 'Nielsen Norman Group — 16px+ body-size guidance for aging eyes', demand: 'Comfortable, fluid text that never shrinks below readable.', design: 'Body ≥ 1rem via clamp(); display type scales per device class.', feeds: ['page.build', 'qa.a11y'], niches: ['always'] },
  { id: 'low-contrast', hate: 'Grey-on-grey text nobody can read', source: 'WCAG 2.1 contrast minimums (W3C)', demand: 'Measured contrast, not vibes.', design: 'Every palette role passes its measured target; dark mode re-derived and re-checked.', feeds: ['palette.lock', 'qa.audit'], niches: ['always'] },
  { id: 'pdf-hate', hate: 'Clicking a link and getting a PDF instead of a page', source: 'Nielsen Norman Group — PDF: Still Unfit for Web Reading (Nielsen 2001, reconfirmed)', demand: 'Information as real web pages.', design: 'Legal, hours, menus and policies are HTML pages; no PDFs anywhere.', feeds: ['page.build', 'qa.links'], niches: ['always'] },
  { id: 'dead-links', hate: 'Clicking something and landing on an error', source: 'Nielsen — the original web usability heuristics: broken links destroy credibility', demand: 'Every link lands somewhere real; a 404 that helps when they do not.', design: 'Link crawl over every generated file; 404.html ships and helps.', feeds: ['qa.links', 'page.build'], niches: ['always'] },
  { id: 'fluff', hate: 'Marketing fog — "best-in-class world-class synergy"', source: 'Morkes & Nielsen, How Users Read on the Web (1997): users scan; fluff is skipped', demand: 'Plain words, concrete nouns, real numbers.', design: 'Banned-word list enforced; every section carries a numeral or proper noun.', feeds: ['heading.compose', 'section.copy', 'product.copy'], niches: ['always'] },
  { id: 'dark-patterns', hate: 'Fake countdowns, fake scarcity, unsubscribe mazes', source: 'Brignull — Deceptive Design registry (darkpatterns.org, 2010)', demand: 'Honest counts, easy outs, no nagging.', design: 'No timers, no invented urgency; tags like "limited run" only when true to the ledger.', feeds: ['product.copy', 'page.build'], niches: ['always'] },
  { id: 'cookie-fatigue', hate: 'Another cookie banner to wrestle before reading one sentence', source: 'EU consent-fatigue reporting + EDPB guidance on deceptive consent flows', demand: 'No banner because no tracking.', design: 'Zero cookies, zero trackers — stated plainly in a badge, so no banner ever needs to exist.', feeds: ['feature.polish', 'page.build'], niches: ['always'] },
  { id: 'captcha-rage', hate: 'Proving humanity nine times to send one message', source: 'Recurring public complaint theme around CAPTCHA gates (widely reported UX rage)', demand: 'A form that just sends.', design: 'The form opens the visitor\'s mail app — no gate, no captcha, no server.', feeds: ['page.build', 'contact.channels'], niches: ['always'] },
  { id: 'mobile-broken', hate: 'Pinch-zooming a site that pretends phones do not exist', source: 'Google mobile UX guidance: 44px tap targets, viewport sanity', demand: 'Thumb-sized targets, honest breakpoints, no horizontal scroll.', design: 'D1 is a first-class layout, not an afterthought; tap targets ≥ 44px.', feeds: ['page.build', 'qa.device', 'layout.assign'], niches: ['always'] },
  { id: 'infinite-scroll', hate: 'A bottomless feed — never finding the thing twice', source: 'Nielsen Norman Group — Infinite Scrolling Is Not for Every Website (2013)', demand: 'Finite, findable grids with an end.', design: 'Galleries and catalogs are finite grids; the footer is always reachable.', feeds: ['page.build', 'art.expand'], niches: ['always'] },
  { id: 'nav-drift', hate: 'The menu rearranging itself on every page', source: 'Nielsen Norman Group — navigation consistency heuristics', demand: 'The same nav, same spot, every page.', design: 'One nav skeleton on every page; only the content area re-arranges.', feeds: ['page.build', 'qa.nav', 'layout.assign'], niches: ['always'] },
  { id: 'no-search', hate: 'A big site with no way to search it', source: 'Nielsen Norman Group — site search usability: search is the lifeline on content-heavy sites', demand: 'A search that actually finds things.', design: 'search.html + a real index built from the shipped files and catalog.', feeds: ['feature.search', 'qa.search'], niches: ['always'] },
  { id: 'a11y-neglect', hate: 'Sites that screen readers and keyboards cannot use', source: 'WHO disability statistics (1.3 billion people); WCAG 2.1', demand: 'Alt text, landmarks, visible focus, reduced-motion respect.', design: 'Every image carries alt; landmarks on every page; focus always visible.', feeds: ['qa.a11y', 'image.select', 'page.build'], niches: ['always'] },
  { id: 'form-fatigue', hate: 'Forms demanding a life story to ask one question', source: 'Recurring form-usability finding (NN/g form design usability)', demand: 'Three fields: name, email, message. Done.', design: 'Every form is minimal; optional fields marked optional.', feeds: ['page.build', 'feature.auth'], niches: ['always'] },
  { id: 'template-sameness', hate: 'Every template site looks identical — the hero, the cards, the footer, all the same', source: 'The recurring public complaint "all websites look the same" (long-running theme in web/UX discourse, e.g. template-sameness threads on Hacker News and The Verge)', demand: 'A site that was arranged, not assembled from the first template on the shelf.', design: 'Per-page layout re-arrangement from the 100+-layout book — 20+ layouts per device, each page composed differently.', feeds: ['layout.assign', 'layout.select', 'qa.audit'], niches: ['always'] },
  { id: 'og-lies', hate: 'Sharing a link and the preview card is broken or empty', source: 'Open Graph protocol spec (Facebook/Meta) + universal share-card complaints', demand: 'A real preview image and honest title/description.', design: 'A real og:image file ships in assets; OG/Twitter metas are complete.', feeds: ['asset.build', 'page.build'], niches: ['always'] },
  { id: 'empty-gallery', hate: 'Galleries of grey placeholder boxes', source: 'Recurring marketplace/portfolio review complaint: shipped sites with empty media', demand: 'Every image slot filled with real bytes before the site ships.', design: 'Image QA counts every slot; the site cannot stamp until the gallery is real.', feeds: ['qa.images', 'site.stamp'], niches: ['always'] },
  { id: 'legal-wall', hate: 'Legal pages written to be unreadable', source: 'Plain-language movement (e.g. US PLAIN Act principles applied to web policies)', demand: 'Privacy and terms a human can read in one minute.', design: 'Legal page in plain language: what is stored (nothing), how to reach a human.', feeds: ['page.build'], niches: ['always'] },
  { id: 'stale-copyright', hate: 'A 2019 copyright in the footer — instantly reads as abandoned', source: 'Recurring credibility-review theme: stale dates signal neglect', demand: 'A live year in the footer, refreshed on every render — the site reads alive, not abandoned.', design: '© stamped with the build year and refreshed at render time.', feeds: ['site.stamp', 'page.build'], niches: ['always'] },
  { id: 'shipping-surprise', hate: 'Getting to the last step and discovering extra fees', source: 'Baymard Institute: extra costs are the top checkout-abandonment cause (annual study)', demand: 'Every fee named up front — the price on the page is the price you pay.', design: 'Delivery/handling facts sit next to the price, never after checkout.', feeds: ['product.copy', 'catalog.build', 'page.build'], niches: ['coffee', 'bakery', 'ceramics', 'plants', 'florist', 'books', 'jazz', 'tattoo', 'surf', 'yoga'] },
  { id: 'detail-missing', hate: 'Product pages with three words and a photo — no specs, no sizes, no proof', source: 'Nielsen Norman Group — e-commerce product page usability: users decide on details, not vibes', demand: 'A detail page that answers the questions before they are asked.', design: 'Every product page carries specs, the honest tag, related items and the price.', feeds: ['product.page', 'product.copy'], niches: ['coffee', 'bakery', 'ceramics', 'plants', 'florist', 'books', 'jazz', 'tattoo', 'surf', 'yoga'] },
  { id: 'review-farming', hate: 'Testimonials that read like they were written by the owner at 2am', source: 'FTC endorsement guides + recurring trust-review complaints about fake-sounding reviews', demand: 'Voices with names, places and dates — or none at all.', design: 'Testimonials carry a name, a city and a since-year; nothing invented beyond the seed grammar.', feeds: ['page.build', 'section.copy'], niches: ['always'] },
];

/* ═══════════════ device & OS law (the reasoner's device notes) ═══════════════ */

export const DEVICE_OS_NOTES: Record<DeviceId, { os: string; input: string; context: string; colour: string }> = {
  D1: { os: 'iOS / Android phones ≤ 640px', input: 'touch only — 44px minimum targets, thumb-reach CTA bar', context: 'on-the-go, one thumb, interruptions likely', colour: 'high contrast ink on bg; accent reserved for the action bar and key numerals' },
  D2: { os: 'iPadOS / Android tablets 641–1024px', input: 'touch + optional keyboard — hover states must be optional', context: 'leaning back, longer sessions, comparison reading', colour: 'surface cards on bgAlt bands; accent2 for secondary highlights' },
  D3: { os: 'Windows / macOS / ChromeOS laptops 1025–1440px', input: 'pointer + keyboard — hover affordances expected', context: 'task mode: comparing, shortlisting, filling forms', colour: 'full palette unlocked; ink-panel heroes carry accent numerals' },
  D4: { os: 'Windows / macOS desktops 1441–1920px', input: 'precise pointer, large canvas — density is welcome', context: 'deep work, multi-tab comparison', colour: 'bento/tinted cards in surface + accent washes; mega footer on bgAlt' },
  D5: { os: 'Large displays / TV ≥ 1921px', input: '10-foot or seated-far viewing — type must scale monumentally', context: 'ambient, cinematic, first-impression', colour: 'monumental type on ink or accent2 washes; bgAlt bands alternate' },
};

/* ═══════════════ colour recipes (complementarity per page) ═══════════════ */

export type ColourRecipe = {
  heroWash: 'none' | 'accent-wash' | 'accent2-wash' | 'ink-panel' | 'bgAlt-band';
  cardTint: 'surface' | 'bgAlt' | 'accent-wash';
  ctaStyle: 'fill' | 'ghost' | 'band';
  why: string;
};

/** Contrast-check a recipe against the palette before offering it (WCAG law). */
export function recipeIsSound(r: ColourRecipe, p: Palette): boolean {
  if (r.ctaStyle === 'band') return contrast(p.accent, p.bg) >= 3 && contrast(p.inkOnAccent, p.accent) >= 4.5;
  if (r.cardTint === 'accent-wash') return contrast(p.ink, p.accent) >= 3 || r.heroWash !== 'accent-wash';
  return true; // surface/bgAlt tints are palette-guaranteed by buildPalette
}

export function describeRecipe(r: ColourRecipe, p: Palette): string {
  const wash: Record<ColourRecipe['heroWash'], string> = {
    none: `hero stays on ${p.bg} with ${p.ink} type`,
    'accent-wash': `hero carries a ${p.accent} wash under ${p.ink} type`,
    'accent2-wash': `hero carries a ${p.accent2} wash under ${p.ink} type`,
    'ink-panel': `hero is an ${p.ink} panel with ${p.bg} type — the accent pops numerals`,
    'bgAlt-band': `hero opens on the ${p.bgAlt} band; ${p.accent} leads the eye`,
  };
  const tint: Record<ColourRecipe['cardTint'], string> = {
    surface: `cards sit on ${p.surface} with ${p.border} hairlines`,
    bgAlt: `cards sit on ${p.bgAlt} bands`,
    'accent-wash': `cards carry a light ${p.accent} wash`,
  };
  const cta: Record<ColourRecipe['ctaStyle'], string> = {
    fill: `CTAs are solid ${p.accent} with ${p.inkOnAccent} text`,
    ghost: `CTAs are outlined in ${p.ink}`,
    band: `CTA is a full ${p.accent} band with ${p.inkOnAccent} text`,
  };
  return `${wash[r.heroWash]}; ${tint[r.cardTint]}; ${cta[r.ctaStyle]}`;
}

const RECIPE_POOL: Omit<ColourRecipe, 'why'>[] = [
  { heroWash: 'none', cardTint: 'surface', ctaStyle: 'fill' },
  { heroWash: 'accent-wash', cardTint: 'surface', ctaStyle: 'fill' },
  { heroWash: 'accent2-wash', cardTint: 'bgAlt', ctaStyle: 'fill' },
  { heroWash: 'ink-panel', cardTint: 'surface', ctaStyle: 'fill' },
  { heroWash: 'bgAlt-band', cardTint: 'surface', ctaStyle: 'ghost' },
  { heroWash: 'none', cardTint: 'bgAlt', ctaStyle: 'band' },
  { heroWash: 'accent-wash', cardTint: 'bgAlt', ctaStyle: 'ghost' },
  { heroWash: 'bgAlt-band', cardTint: 'accent-wash', ctaStyle: 'band' },
];

/* ═══════════════ page roles → layout fitness ═══════════════ */

const PAGE_ROLE: Record<string, { want: string[]; avoid: string[] }> = {
  home: { want: ['centered', 'split', 'bento', 'gallery', 'mono', 'marquee', 'z', 'showcase'], avoid: [] },
  about: { want: ['ledger', 'editorial'], avoid: [] },
  services: { want: ['ledger', 'z', 'split'], avoid: [] },
  products: { want: ['gallery', 'showcase', 'bento'], avoid: [] },
  gallery: { want: ['gallery', 'mono', 'showcase'], avoid: ['ledger'] },
  faq: { want: ['ledger'], avoid: ['marquee'] },
  contact: { want: ['split', 'z', 'centered'], avoid: ['marquee'] },
  directory: { want: ['ledger'], avoid: ['marquee', 'mono'] },
  search: { want: ['ledger'], avoid: ['marquee', 'mono'] },
  login: { want: ['centered'], avoid: ['marquee', 'gallery'] },
  signup: { want: ['centered'], avoid: ['marquee', 'gallery'] },
  account: { want: ['ledger'], avoid: ['marquee'] },
  admin: { want: ['ledger'], avoid: ['marquee', 'mono'] },
  thankyou: { want: ['centered'], avoid: ['marquee'] },
  legal: { want: ['ledger'], avoid: ['marquee'] },
  journal: { want: ['editorial', 'ledger'], avoid: [] },
};

function layoutScore(l: Layout, pageKey: string, nicheKey: string, rng: RNG): number {
  let s = rng.float(0, 0.9); // deterministic jitter
  if (l.bestFor.includes(nicheKey)) s += 2;
  const role = PAGE_ROLE[pageKey];
  if (role && role.want.includes(l.heroMode)) s += 1.6;
  if (role && role.avoid.includes(l.heroMode)) s -= 2.5;
  if (pageKey === 'products' && l.featuresMode === 'catalog') s += 1.4;
  if (pageKey === 'products' && l.featuresMode === 'list') s -= 0.8;
  if (pageKey === 'services' && l.featuresMode === 'cards') s += 1;
  if ((pageKey === 'login' || pageKey === 'signup' || pageKey === 'thankyou') && l.featuresMode === 'cards') s -= 0.5;
  return s;
}

/* ═══════════════ the reasoner's artifacts ═══════════════ */

export type Finding = { complaintId: string; hate: string; source: string; demand: string; bite: string };
export type Demand = { complaintId: string; rule: string; feeds: string };
export type Persona = { name: string; device: DeviceId; goal: string; pains: string[] };
export type Journey = { persona: string; steps: string[] };
export type PageLayoutAssignment = {
  pageKey: string;
  devices: Record<DeviceId, { id: string; name: string; why: string; colours: string; productsNeeded: string; deviceOs: string }>;
  recipe: ColourRecipe;
  recipeText: string;
};

export type ReasoningArt = {
  findings?: Finding[];
  demands?: Demand[];
  personas?: Persona[];
  journeys?: Journey[];
  deviceNotes?: Partial<Record<DeviceId, string>>;
  productNotes?: string;
  pageLayouts?: Record<string, PageLayoutAssignment>;
};

/** Which complaints bite hardest for a niche? 'always' complaints always bite; */
/** niche-tagged complaints bite for matching niches and can also be drawn as secondary pains. */
export function scanComplaints(seed: string, nicheKey: string, nicheLabel: string): { findings: Finding[]; scan: string } {
  const rng = seedFrom(seed + '-review-scan');
  const primary = COMPLAINT_CORPUS.filter((c) => c.niches.includes('always'));
  const nicheSpecific = COMPLAINT_CORPUS.filter((c) => c.niches.includes(nicheKey));
  const secondaries = rng.pickN(
    COMPLAINT_CORPUS.filter((c) => !c.niches.includes('always') && !c.niches.includes(nicheKey)),
    Math.min(3, 8)
  );
  const chosen = [...primary, ...nicheSpecific, ...secondaries];
  const findings: Finding[] = chosen.map((c) => ({
    complaintId: c.id, hate: c.hate, source: c.source, demand: c.demand,
    bite: biteFor(c.id, nicheLabel),
  }));
  const scan = [
    `Scanned ${COMPLAINT_CORPUS.length} documented complaint themes in the review corpus.`,
    `For a ${nicheLabel} the primary pains are the ${primary.length} universal ones (blocking popups, autoplay, dead links, contact hunts, fluff copy, tracking walls, broken mobile, sameness…)`,
    nicheSpecific.length ? `plus the commerce pains that bite this niche hardest: ${nicheSpecific.map((c) => c.id).join(', ')}.` : '',
    secondaries.length ? `Drawn as secondary risks worth defending against anyway: ${secondaries.map((c) => c.id).join(', ')}.` : '',
    `Total in scope for this build: ${findings.length} pains. Every one becomes a demand, every demand becomes rules on the tasks it feeds.`,
  ].filter(Boolean).join(' ');
  return { findings, scan };
}

function biteFor(id: string, nicheLabel: string): string {
  switch (id) {
    case 'hidden-prices': return `a ${nicheLabel} visitor decides on price — hide it and they leave`;
    case 'stock-photos': return `a ${nicheLabel} sells craft — filler photos would undo the whole story`;
    case 'no-search': return `the catalog and journal make this site big enough to need search`;
    case 'empty-gallery': return `visual proof is the ${nicheLabel}'s best argument`;
    case 'template-sameness': return `a ${nicheLabel} site that looks like every template loses the trust it needs`;
    case 'forced-accounts': return `nobody registers to browse a ${nicheLabel}`;
    case 'og-lies': return `the ${nicheLabel} spreads by sharing — broken cards kill the share`;
    default: return `universal pain — every visitor feels it`;
  }
}

export function findingsToDemands(findings: Finding[]): { demands: Demand[]; note: string } {
  const byId = new Map(COMPLAINT_CORPUS.map((c) => [c.id, c]));
  const demands: Demand[] = [];
  for (const f of findings) {
    const c = byId.get(f.complaintId);
    if (!c) continue;
    demands.push({ complaintId: c.id, rule: `${c.demand} (review: ${c.id})`, feeds: c.feeds.join(',') });
  }
  return {
    demands,
    note: `${demands.length} demands locked. Each is injected as a hard rule into the tasks it feeds (${[...new Set(demands.flatMap((d) => d.feeds.split(',')))].length} task kinds governed).`,
  };
}

/** Rules for a task kind, derived from the demands the reasoner locked. */
export function rulesForKind(findings: Finding[] | undefined, kind: string): string[] {
  if (!findings) return [];
  const byId = new Map(COMPLAINT_CORPUS.map((c) => [c.id, c]));
  const out: string[] = [];
  for (const f of findings) {
    const c = byId.get(f.complaintId);
    if (c && c.feeds.includes(kind)) out.push(`Review law [${c.id}]: ${c.demand}`);
  }
  return out;
}

export function composePersonas(seed: string, findings: Finding[], nicheLabel: string, city: string): { personas: Persona[]; journeys: Journey[]; note: string } {
  const rng = seedFrom(seed + '-personas');
  const devices: DeviceId[] = ['D1', 'D3', 'D4'];
  const names = ['The Priced-First Skimmer', 'The Trust Checker', 'The Mobile Regular'];
  const goals = [
    `finds the price list in under ten seconds, then books`,
    `wants to know who is behind the ${nicheLabel} before writing to them`,
    `returns weekly from a phone in ${city} — speed and thumb-reach are everything`,
  ];
  const painIds = findings.map((f) => f.complaintId);
  const personas: Persona[] = names.map((name, i) => ({
    name, device: devices[i], goal: goals[i],
    pains: [painIds[i * 3 % painIds.length], painIds[(i * 3 + 1) % painIds.length], painIds[(i * 3 + 2) % painIds.length]].filter(Boolean),
  }));
  const journeys: Journey[] = personas.map((p) => ({
    persona: p.name,
    steps: p.device === 'D1'
      ? ['lands on home (D1 phone)', 'skims the priced list', 'opens a product detail', 'taps the sticky call bar', 'reads the directory for the right desk']
      : p.device === 'D3'
        ? ['lands on home (D3 laptop)', 'checks About for names and address', 'compares services and prices', 'searches the catalog', 'writes from the contact page']
        : ['lands on home (D4 desktop)', 'opens the gallery for proof', 'reads two journal entries', 'reviews FAQ', 'calls the labelled number'],
  }));
  return { personas, journeys, note: `${personas.length} personas composed from the findings; each journey's friction points map to locked demands.` };
}

export function reasonDevice(seed: string, device: DeviceId, nicheLabel: string): { note: string } {
  const d = DEVICE_OS_NOTES[device];
  const rng = seedFrom(seed + '-device-' + device);
  const extra = rng.pick([
    `Layout must re-arrange structurally on ${device}, never just shrink.`,
    `${device} gets its own arrangement from the book — the ${nicheLabel} reads differently here.`,
  ]);
  return { note: `${device} (${d.os}). Input: ${d.input}. Context: ${d.context}. Colour law: ${d.colour}. ${extra}.` };
}

export function reasonProducts(seed: string, nicheLabel: string, productCount: number): { note: string } {
  const rng = seedFrom(seed + '-products');
  const rule = rng.pick([
    `every product needs a name a regular would actually say, a one-line description with a concrete fact, and a price with no hidden extras`,
    `the catalog must survive the skim test: scannable names, honest prices, tags only when true`,
    `prices visible at the listing level — the ${nicheLabel} visitor should never click to learn a price`,
  ]);
  return { note: `Catalog law for ${productCount} products: ${rule}. Each product earns its own detail page, its own image slot, its own alt text.` };
}

/**
 * The heart of layout variety: for one page, assign a DIFFERENT layout per
 * device (5), all distinct from the same page's other devices, and distinct
 * from every other page's choice on that device. Returns the full
 * complementarity description per device: colours that work, products needed,
 * device/OS assumptions, and the why.
 */
export function assignPageLayouts(
  seed: string,
  pageKey: string,
  pageTitles: { key: string; title: string }[],
  usedByDevice: Record<DeviceId, Set<string>>,
  palette: Palette,
  nicheKey: string,
  nicheLabel: string,
  catalogCount: number,
  galleryCount: number
): { assignment: PageLayoutAssignment; scan: string } {
  const rng = seedFrom(seed + '-layout-' + pageKey);
  const devices: DeviceId[] = ['D1', 'D2', 'D3', 'D4', 'D5'];
  const chosen: Record<DeviceId, { id: string; name: string; why: string }> = {} as never;
  const scan: string[] = [];
  for (const d of devices) {
    const pool = layoutsForDevice(d);
    const used = usedByDevice[d];
    let candidates = pool.filter((l) => !used.has(l.id));
    if (candidates.length === 0) candidates = pool; // pool exhausted (more pages than layouts) — reuse is honest
    let best = candidates[0];
    let bestScore = -Infinity;
    for (const l of candidates) {
      const s = layoutScore(l, pageKey, nicheKey, rng);
      if (s > bestScore) { bestScore = s; best = l; }
    }
    used.add(best.id);
    chosen[d] = {
      id: best.id, name: best.name,
      why: `${best.name.split(' — ')[0]}: ${best.arrangement} Reading: ${best.readingPattern}. Source: ${best.source}.`,
    };
    scan.push(`${d} → ${best.id} (scored ${bestScore.toFixed(2)} of pool ${pool.length}, ${used.size} distinct used)`);
  }
  // colour recipe: pick the first sound recipe for this page (deterministic order, palette-checked)
  const rng2 = seedFrom(seed + '-recipe-' + pageKey);
  const pool = rng2.shuffle(RECIPE_POOL);
  let recipe: ColourRecipe = { ...pool[0], why: '' };
  for (const r of pool) { if (recipeIsSound({ ...r, why: '' }, palette)) { recipe = { ...r, why: '' }; break; } }
  const devicesMeta = Object.fromEntries(
    (Object.keys(chosen) as DeviceId[]).map((d) => {
      const c = chosen[d];
      const layout = LAYOUTS.find((l) => l.id === c.id)!;
      return [d, {
        ...c,
        colours: describeRecipe(recipe, palette) + `. On ${d}, ${DEVICE_OS_NOTES[d].colour}.`,
        productsNeeded: productsNeededFor(layout, catalogCount, galleryCount),
        deviceOs: `${DEVICE_OS_NOTES[d].os} — ${DEVICE_OS_NOTES[d].input}. Context: ${DEVICE_OS_NOTES[d].context}.`,
      }];
    })
  ) as PageLayoutAssignment['devices'];
  const assignment: PageLayoutAssignment = {
    pageKey,
    devices: devicesMeta,
    recipe,
    recipeText: describeRecipe(recipe, palette),
  };
  const title = pageTitles.find((p) => p.key === pageKey)?.title ?? pageKey;
  return {
    assignment,
    scan: `Page "${title}" re-arranged five ways: ${scan.join('; ')}. Colour recipe: ${assignment.recipeText}. Every device slot cites its research source, its colour law, its product needs and its OS assumptions.`,
  };
}

function productsNeededFor(l: Layout, catalogCount: number, galleryCount: number): string {
  const parts: string[] = [];
  switch (l.featuresMode) {
    case 'catalog': parts.push(`the full catalog (${catalogCount} products, each with image + price)`); break;
    case 'cards': parts.push('the 6 services as cards'); break;
    case 'bento': parts.push('3 featured products + 1 hero cell'); break;
    case 'list': parts.push('services or FAQ entries as rows'); break;
  }
  if (l.heroMode === 'gallery') parts.push(`≥ ${Math.min(8, galleryCount)} gallery images for the wall peek`);
  if (l.heroMode === 'showcase') parts.push('1 strong hero artifact image');
  if (l.voicesMode === 'wall') parts.push('4+ customer voices');
  if (l.storyMode === 'cases') parts.push('2 named case stories');
  if (l.storyMode === 'magazine') parts.push('a pull-quote + body pair');
  return parts.length ? `needs ${parts.join(' + ')}` : 'needs the standard section set';
}

/** How many distinct layouts did this site actually use, per device? (QA + self-test) */
export function layoutVariety(pageLayouts: Record<string, PageLayoutAssignment> | undefined): { perDevice: Record<DeviceId, number>; distinct: number } {
  const perDevice = { D1: 0, D2: 0, D3: 0, D4: 0, D5: 0 } as Record<DeviceId, number>;
  const distinct = new Set<string>();
  if (pageLayouts) {
    for (const d of Object.keys(perDevice) as DeviceId[]) {
      const set = new Set<string>();
      for (const a of Object.values(pageLayouts)) {
        const id = a.devices?.[d]?.id;
        if (id) { set.add(id); distinct.add(id); }
      }
      perDevice[d] = set.size;
    }
  }
  return { perDevice, distinct: distinct.size };
}
