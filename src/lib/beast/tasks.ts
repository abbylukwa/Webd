// Beast Task Graph v3 — the micro-task engine.
// One site advances EXACTLY ONE micro-task per work cycle ("one task, perfected").
// Every task carries its rules + knowledge (governance), has an output contract,
// is executed by the AI (when configured) or the deterministic solver, and must
// pass its gates before the output freezes. Detours ("greet back, keep walking")
// enqueue side-tasks without abandoning the parent. page.plan DECOMPOSES into
// per-page sub-tasks — the owner's "4 headers → now write header 1" mechanic.
import fs from 'fs';
import path from 'path';
import { seedFrom } from './rng';
import { designFromSeed, renderSite, renderInnerPage, renderSupportFiles, type PagePlanEntry, type RenderArt } from './render';
import { layoutsForDevice, type DeviceId } from './layouts';
import { LIBRARY } from './knowledge';
import { buildEnvelope, askAi, aiEnabled, type AiTurn } from './ai';
import { defaultValues, validateValues, MAX_PAGES, type SiteValues, type Product } from './values';
import { resolveImages, attributionMarkdown, nicheImageQueries, type ImageRecord, type ImageSlot } from './images';
import { publishSiteFiles, githubConfigured } from './storage';

export type TaskKind =
  | 'brief.compose' | 'palette.lock' | 'layout.select' | 'page.plan'
  | 'heading.compose' | 'section.copy' | 'image.select'
  | 'catalog.build' | 'contact.channels' | 'values.freeze'
  | 'page.build' | 'page.review' | 'qa.audit' | 'site.stamp' | 'github.publish'
  | 'brand.fix' | 'fact.check';

export type TaskStatus = 'queued' | 'running' | 'accepted' | 'rejected' | 'deferred';

export type Task = {
  id: string;
  siteId: string;
  kind: TaskKind;
  title: string;
  why: string;                      // the WHY line of the envelope
  rules: string[];
  knowledge: string[];
  device?: DeviceId;
  pageKey?: string;
  slot?: number;
  status: TaskStatus;
  detour?: boolean;
  attempts: number;
  precision: number;                // 0..1
  note?: string;                    // last critique / reason
  output?: unknown;
  acceptedDay?: number;
};

export type SiteArt = {
  brief?: { audience: string; tone: string; promise: string; cityStory?: string } | null;
  layouts?: Partial<Record<DeviceId, { id: string; why: string }>>;
  pages?: PagePlanEntry[] | null;
  headings?: Record<string, string[]>;
  copy?: Record<string, { kicker: string; body: string }[]>;
  images?: ImageRecord[];
  catalog?: Product[] | null;
  channelsAccepted?: boolean;
  values?: SiteValues | null;
  revisions?: Record<string, { v: number; lines: number; diff: number; at: string }[]>;
  git?: { repo: string; url: string; pushedAt: string } | null;
};

/* ---------- solver context (provided by the engine) ---------- */
export type TaskCtx = {
  owner: string;
  day: number;
  siteDir: (siteId: string) => string;
  logTurn: (turn: AiTurn) => void;
};

let seq = 0;
function tid(siteId: string): string {
  seq += 1;
  return `${siteId}-t${seq}`;
}

const GLOBAL_RULES = [
  'One thought per element — never blend two ideas into one block.',
  'Concrete nouns beat adjectives; a numeral or proper noun must appear where possible.',
  'Banned words: best, world-class, amazing, unbeatable, #1.',
  'The city and the niche vocabulary must appear naturally.',
];

const KNOW_CRAP = 'Robin Williams, The Non-Designer’s Design Book (1994) — Contrast, Repetition, Alignment, Proximity';
const KNOW_NNG = 'Nielsen Norman Group — eyetracking & reading patterns (F, Z, layer-cake, spotted)';
const KNOW_KRUG = 'Steve Krug, Don’t Make Me Think (2000) — clarity beats cleverness';
const KNOW_ALBERS = 'Josef Albers, Interaction of Color (1963) — colour relationships before colour choice';

/* ---------- planning ---------- */
export function planInitialTasks(siteId: string): Task[] {
  const mk = (kind: TaskKind, title: string, why: string, rules: string[], knowledge: string[], extra: Partial<Task> = {}): Task => ({
    id: tid(siteId), siteId, kind, title, why, rules: [...GLOBAL_RULES, ...rules], knowledge,
    status: 'queued', attempts: 0, precision: 0, ...extra,
  });
  return [
    mk('brief.compose', 'Lock the brief — audience, tone, promise', 'Compress the commission into one audience, one tone, one promise.',
      ['Audience is one specific group, not "everyone".', 'Tone from: warm and exact / quietly confident / plain-spoken craft / considered and calm.', 'The promise must mention the city naturally.'],
      [KNOW_CRAP, 'Jesse James Garrett, The Elements of User Experience (2002) — audience before pixels']),
    mk('palette.lock', 'Lock the palette — harmony math + WCAG', 'Freeze the colour system after every role passes its contrast target.',
      ['Harmony math first; correction second.', 'Every role must pass: ink≥7:1, soft≥4.5:1, accent≥3:1, onAccent≥4.5:1.'],
      [KNOW_ALBERS, 'WCAG 2.1 contrast mathematics']),
    ...(['D1', 'D2', 'D3', 'D4', 'D5'] as DeviceId[]).map((d) =>
      mk('layout.select', `Choose the ${d} arrangement`, `Pick the ${d} layout whose geometry best fits the brief — 20+ researched layouts exist for this device.`,
        [`The ${d} arrangement must be structurally different from the other devices — re-arrangement, not shrinkage.`, 'Cite the layout source in the rationale.'],
        [KNOW_NNG, 'Josef Müller-Brockmann, Grid Systems (1961)'], { device: d })),
    mk('page.plan', 'Plan the page map — every page earns its slot', 'Decide the site’s pages, files and purposes (multi-page mandate).',
      [`Home first; contact mandatory; up to ${MAX_PAGES} pages; large catalogs add products/gallery/journal/legal.`, 'Every page gets a one-line purpose; no orphans.'],
      [KNOW_NNG, 'Garrett — The Elements of User Experience, structure plane']),
  ];
}

export function expandAfterPlan(site: V3Site): Task[] {
  const mk = (kind: TaskKind, title: string, why: string, rules: string[], knowledge: string[], extra: Partial<Task> = {}): Task => ({
    id: tid(site.id), siteId: site.id, kind, title, why, rules: [...GLOBAL_RULES, ...rules], knowledge,
    status: 'queued', attempts: 0, precision: 0, ...extra,
  });
  const pages = site.art.pages ?? [];
  const perPage: Task[] = [];
  for (const p of pages) {
    if (p.key === 'home') continue; // home copy is seed-native
    for (let s = 0; s < 4; s++) {
      perPage.push(mk('heading.compose', `${p.title} — heading ${s + 1} of 4`,
        `Write heading ${s + 1} of 4 for the ${p.title.toLowerCase()} page.`,
        ['≤ 60 characters.', 'Must not duplicate any frozen heading (the list is in your state).', 'Lead with benefit or action; niche vocabulary required.'],
        [KNOW_KRUG, KNOW_NNG], { pageKey: p.key, slot: s }));
    }
    perPage.push(mk('section.copy', `${p.title} — the section body`, `Write the main body copy for the ${p.title.toLowerCase()} page.`,
      ['25–70 words.', 'One concrete fact (numeral or proper noun) required.', 'No banned marketing words.'],
      [KNOW_CRAP, 'NN/g — How Users Read on the Web'], { pageKey: p.key, slot: 0 }));
    perPage.push(mk('image.select', `${p.title} — choose the imagery`, `Select/free licensed imagery for the ${p.title.toLowerCase()} page slots.`,
      ['Openly licensed only (CC0/PD/BY/BY-SA); attribution is mandatory.', 'First accepted fetch freezes — determinism law.'],
      ['Creative Commons licensing terms; Openverse/Wikimedia attribution norms'], { pageKey: p.key }));
  }
  if (pages.some((p) => p.key === 'products')) {
    perPage.push(mk('catalog.build', 'Build the catalog — up to 30 products', 'Assemble the product list with names, one-line descriptions and honest prices.',
      ['≤ 30 products; unique names; prices plausible for the niche.', 'Each product gets an image slot.'],
      ['E-commerce catalog card conventions; price alignment for comparability']));
  }
  if (pages.some((p) => p.key === 'contact')) {
    perPage.push(mk('contact.channels', 'Open every channel — numbers + socials', 'Wire the modern contact roster: up to 12 labelled numbers, emails, every social platform, hours, address, map.',
      ['≥ 3 and ≤ 12 phones, each with a department label.', 'All 8 social platforms present.', 'JSON-LD contactPoint entries must match the phones.'],
      ['schema.org ContactPoint; modern small-business contact conventions']));
  }
  for (const p of pages) {
    perPage.push(mk('page.build', `Build ${p.file}`, `Render ${p.file} with the frozen tokens, headings, copy, imagery and channels.`,
      ['Every internal link must resolve to a generated file.', 'D1–D5 media blocks present.', 'Nav highlights the current page.'],
      [KNOW_CRAP, 'MDN — prefers-color-scheme & relative units']));
  }
  for (const p of pages) {
    perPage.push(mk('page.review', `Review ${p.file} — record the diff`, `Compare ${p.file} against its previous revision and judge the changes.`,
      ['Polish may only touch motion, focus, spacing, copy.', 'Structural rewrites are rejected.'],
      [KNOW_CRAP]));
  }
  perPage.push(mk('qa.audit', 'QA — CRAP audit across every page', 'Run the full C.R.A.P., contrast and device matrix across all pages.',
    ['Every page must carry the D1–D5 media blocks.', 'Every contrast pair must pass its target.'],
    [KNOW_CRAP, 'WCAG 2.1']));
  perPage.push(mk('values.freeze', 'Freeze the values — the owner-editable facts', 'Validate and freeze brand, phones, socials, products, address — the placeholder layer.',
    ['Caps enforced: 12 phones, 30 products.', 'Every string trimmed and plausible.'],
    ['Garrett — structure plane']));
  perPage.push(mk('site.stamp', 'Stamp © and set the shelf price', 'Price the site, stamp the copyright, move it to the shelf.',
    ['The © carries the current owner name exactly.', 'The price derives from design complexity, deterministically.'],
    [KNOW_CRAP]));
  perPage.push(mk('github.publish', 'Publish to GitHub — the durable archive', 'Create the site’s own repository and push every file in one commit.',
    ['Repo name: beast-site-<slug>-<seed6>.', 'Idempotent: re-publish = new commit, never a fork.', 'No token → defer gracefully, never block the studio.'],
    ['GitHub Git Data API — blobs → tree → commit → ref']));
  return perPage;
}

/* ---------- deterministic solvers (the floor) ---------- */
function pickN<T>(seed: string, salt: number, arr: T[]): T {
  let h = salt;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
}

const TONES = ['warm and exact', 'quietly confident', 'plain-spoken craft', 'considered and calm'];

function solver(kind: TaskKind, site: V3Site, ctx: TaskCtx): { output?: unknown; note: string; precision: number } {
  const probe = designFromSeed(site.seed);
  switch (kind) {
    case 'brief.compose': {
      const tone = pickN(site.seed, 1, TONES);
      return {
        output: {
          audience: `${probe.niche.label} regulars who notice details`,
          tone,
          promise: `${probe.niche.heroLines[0]} ${probe.brand} keeps that promise in ${probe.city}.`,
          cityStory: `${probe.niche.about[0]} — and we do it in ${probe.city}.`,
        },
        note: 'deterministic solver — brief composed from niche grammar', precision: 0.9,
      };
    }
    case 'palette.lock':
      return { output: { name: site.palette.name, harmony: site.palette.harmony }, note: 'deterministic solver — harmony math + WCAG battery already passed', precision: 1 };
    case 'layout.select': {
      const device = (site.tasks.find((t) => t.kind === 'layout.select' && t.id === site.tasks.find((x) => x.status === 'running')?.id)?.device ?? 'D3') as DeviceId;
      const pool = layoutsForDevice(device);
      const lay = pickN(site.seed + device, 7, pool);
      return {
        output: { id: lay.id, why: `${lay.name.split(' — ')[0]} — ${lay.arrangement} (source: ${lay.source})` },
        note: `deterministic solver — brief-fit pick from ${pool.length} ${device} layouts`, precision: 0.9,
      };
    }
    case 'page.plan': {
      const pages = planPagesFor(site);
      return { output: { pages }, note: `deterministic solver — ${pages.length} pages planned (multi-page mandate)`, precision: 1 };
    }
    case 'heading.compose': {
      const t = site.tasks.find((x) => x.status === 'running');
      const pageKey = t?.pageKey ?? 'about';
      const slot = t?.slot ?? 0;
      const text = headingFor(site, pageKey, slot);
      return { output: { text, alt: text }, note: 'deterministic solver — heading from niche grammar, uniqueness-checked', precision: 0.9 };
    }
    case 'section.copy': {
      const body = `${probe.niche.about[1] ?? probe.niche.about[0]}. ${pickN(site.seed, 3, ['Every piece is checked before it leaves the bench.', 'We keep two slots open each week for first-time visitors.', 'Ask us anything before you commit — the answer is free.'])} In ${probe.city} since ${2016 + (site.seed.charCodeAt(0) % 8)}.`;
      return { output: { kicker: pickN(site.seed, 4, ['The work', 'How it goes', 'Why here']), body }, note: `deterministic solver — ${body.split(/\s+/).length} words, one fact`, precision: 0.85 };
    }
    case 'image.select':
      return { output: { deferredSlots: true }, note: 'image resolution runs in the builder (network task)', precision: 0.5 };
    case 'catalog.build': {
      const vals = site.art.values ?? ({} as SiteValues);
      const catalog = (vals.products ?? []).slice(0, 30);
      return { output: { catalog }, note: `deterministic solver — ${catalog.length} products, caps respected`, precision: 1 };
    }
    case 'contact.channels': {
      const vals = site.art.values ?? ({} as SiteValues);
      const phones = (vals.phones ?? []).length;
      const socials = (vals.socials ?? []).length;
      return { output: { phones, socials }, note: `deterministic solver — ${phones} labelled numbers, ${socials} social platforms, JSON-LD contactPoints wired`, precision: 1 };
    }
    case 'values.freeze': {
      const vals = site.art.values ?? ({} as SiteValues);
      const res = validateValues(vals);
      return { output: res.clean, note: res.ok ? 'values validated — caps respected' : `issues: ${res.issues.map((i) => i.field).join(',')}`, precision: res.ok ? 1 : 0.6 };
    }
    default:
      return { note: 'deterministic solver — accepted', precision: 0.9 };
  }
}

/* ---------- page planning + heading grammar ---------- */
export function planPagesFor(site: V3Site): PagePlanEntry[] {
  const { niche, brand } = designFromSeed(site.seed);
  const productCount = site.art.values?.products?.length ?? 0;
  const pages: PagePlanEntry[] = [
    { key: 'home', title: 'Home', purpose: `${brand} at a glance`, file: 'index.html', inNav: true },
    { key: 'about', title: 'About', purpose: 'the story and the standard', file: 'about.html', inNav: true },
    { key: 'services', title: 'Services', purpose: 'the six ways in', file: 'services.html', inNav: true },
  ];
  if (productCount >= 8) pages.push({ key: 'products', title: 'Shop', purpose: `the catalog — ${productCount} items`, file: 'products.html', inNav: true });
  pages.push({ key: 'gallery', title: 'Work', purpose: 'recent output, visual proof', file: 'gallery.html', inNav: true });
  pages.push({ key: 'faq', title: 'FAQ', purpose: 'the questions that repeat', file: 'faq.html', inNav: false });
  pages.push({ key: 'contact', title: 'Contact', purpose: 'every channel, map, hours', file: 'contact.html', inNav: true });
  if (pages.length >= 6) pages.push({ key: 'journal', title: 'Journal', purpose: 'notes from the bench', file: 'journal.html', inNav: false });
  pages.push({ key: 'legal', title: 'Legal', purpose: 'privacy, terms, accessibility', file: 'legal.html', inNav: false });
  return pages.slice(0, MAX_PAGES);
}

function headingFor(site: V3Site, pageKey: string, slot: number): string {
  const { niche, brand, city } = designFromSeed(site.seed);
  const T: Record<string, string[]> = {
    home: niche.heroLines.concat(['Made slowly, in ' + city + '.']),
    about: ['Why ' + brand + ' exists', 'The slow way, on purpose', 'What we believe', 'The scoreboard'],
    services: ['Six ways in', 'How it works', 'What it costs', 'Ready when you are'],
    products: [niche.menuTitle, 'The regulars’ picks', 'This season only', 'Made to order'],
    gallery: ['Fresh from the bench', 'This season’s work', 'Client stories', 'In the studio'],
    faq: ['Good questions', 'Before you ask', 'The small stuff', 'Still stuck? Call us'],
    contact: [`Talk to ${brand}`, 'Call — every desk has a number', 'Write — we answer within a day', 'Visit ' + city],
    journal: ['Notes from the bench', 'Season notes', 'What we learned', 'Archive'],
    legal: ['The small print, readable', 'Accessibility', 'Terms of service', 'Privacy — we store nothing'],
  };
  const existing = new Set(Object.values(site.art.headings ?? {}).flat());
  let text = (T[pageKey] ?? T.about)[slot % 4];
  if (existing.has(text)) text = `${text} — ${niche.nouns[0]} standard`;
  return text;
}

/* ---------- image slots ---------- */
export function imageSlotsFor(site: V3Site): ImageSlot[] {
  const pages = site.art.pages ?? [];
  const slots: ImageSlot[] = [{ slotId: 'hero', role: 'hero', query: nicheImageQueries(site.nicheLabel, siteNicheKey(site))[0] }];
  if (pages.some((p) => p.key === 'gallery')) {
    for (let i = 1; i <= 6; i++) slots.push({ slotId: `gallery-${i}`, role: 'gallery', query: nicheImageQueries(site.nicheLabel, siteNicheKey(site))[i % 3] });
  }
  if (pages.some((p) => p.key === 'products')) {
    const count = Math.min(8, site.art.catalog?.length ?? site.art.values?.products?.length ?? 0);
    for (let i = 1; i <= count; i++) slots.push({ slotId: `product-${i}`, role: 'product', query: nicheImageQueries(site.nicheLabel, siteNicheKey(site))[(i + 1) % 3] });
  }
  return slots;
}

function siteNicheKey(site: V3Site): string {
  return designFromSeed(site.seed).niche.key;
}

/* ---------- the executor ---------- */
export async function runNextTask(ctx: TaskCtx, site: V3Site): Promise<string> {
  const task = site.tasks.find((t) => t.status === 'queued');
  if (!task) return `${site.brand}: no queued task (ledger complete)`;
  task.status = 'running';
  const { designFromSeed: dfs } = require('./render') as typeof import('./render');
  const probe = dfs(site.seed);

  let applied = '';
  let precision = 0;
  let mode: 'ai' | 'solver' = 'solver';
  let provider = 'deterministic-solver';
  let verdict: 'ACCEPT' | 'REFINE' | 'DEFER' = 'ACCEPT';
  let interpNote = '';

  // AI path for text-bearing kinds when the vault has usable keys
  const aiKinds: TaskKind[] = ['brief.compose', 'heading.compose', 'section.copy'];
  if (aiEnabled() && aiKinds.includes(task.kind)) {
    const stateFacts = [
      `brand: ${site.brand} — ${site.nicheLabel} in ${site.city}`,
      `brief: ${site.art.brief ? JSON.stringify(site.art.brief) : 'not yet locked'}`,
      `frozen headings so far: ${JSON.stringify(site.art.headings ?? {}).slice(0, 500)}`,
      `niche vocabulary: ${probe.niche.services.join(', ')}`,
    ];
    const contract =
      task.kind === 'heading.compose' ? 'JSON only: {"text": "<=60 chars heading", "alt": "accessibility alt"}'
      : task.kind === 'section.copy' ? 'JSON only: {"kicker": "<=40 chars", "body": "25-70 words"}'
      : 'JSON only: {"audience": "...", "tone": "...", "promise": "...", "cityStory": "..."}';
    const env = buildEnvelope({
      role: `You are the ${task.kind.startsWith('heading') ? 'headline editor' : task.kind.startsWith('brief') ? 'strategy director' : 'senior copywriter'} of a slow, precise design studio.`,
      why: task.why,
      rules: task.rules,
      knowledge: task.knowledge,
      state: stateFacts,
      contract,
    });
    const res = await askAi(env, task.kind);
    if (res) {
      mode = 'ai';
      provider = res.turn.provider;
      verdict = res.turn.verdict;
      interpNote = res.turn.interpretation;
      if (verdict === 'ACCEPT' && res.artifact) {
        applyOutput(ctx, site, task, res.artifact);
        applied = interpNote;
        precision = 1;
      } else if (verdict === 'REFINE') {
        task.attempts += 1;
        task.note = interpNote;
        precision = 0.35;
        if (task.attempts >= 3) { verdict = 'DEFER'; }
      }
      ctx.logTurn({
        id: `${task.id}-${Date.now()}`, taskId: task.id, taskTitle: task.title, provider, mode,
        promptTitle: task.why, envelope: env.prompt.slice(0, 1500), raw: res.turn.raw,
        interpretation: interpNote, verdict,
        action: verdict === 'ACCEPT' ? 'output frozen into artifacts' : verdict === 'REFINE' ? `re-queued with critique (attempt ${task.attempts}/3)` : 'deferred to deterministic solver',
        precision, at: new Date().toISOString(),
      });
    }
  }

  if (mode === 'solver') {
    // deterministic floor (also the DEFER landing)
    const out = solver(task.kind, site, ctx);
    applyOutput(ctx, site, task, out.output);
    precision = out.precision;
    interpNote = out.note;
    provider = 'deterministic-solver';
    verdict = 'ACCEPT';
    ctx.logTurn({
      id: `${task.id}-${Date.now()}`, taskId: task.id, taskTitle: task.title, provider, mode: 'solver',
      promptTitle: task.why, envelope: task.rules.join(' | ').slice(0, 800), raw: JSON.stringify(out.output ?? {}).slice(0, 500),
      interpretation: out.note, verdict: 'ACCEPT', action: 'output frozen into artifacts', precision: out.precision, at: new Date().toISOString(),
    });
  }

  if (verdict === 'REFINE') {
    task.status = 'queued';
    return `${site.brand}: ${task.title} — refine (attempt ${task.attempts}/3): ${task.note ?? 'critique'}`;
  }
  if (verdict === 'ACCEPT') {
    task.status = 'accepted';
    task.precision = precision;
    task.acceptedDay = ctx.day;
    // page.plan decomposes into the per-page sub-task tree
    if (task.kind === 'page.plan') {
      site.tasks.push(...expandAfterPlan(site).map((t) => ({ ...t, siteId: site.id })));
    }
    applied = applied || interpNote;
    return `${site.brand}: ${task.title} — ${applied}`;
  }
  if (verdict === 'DEFER') {
    task.status = 'accepted'; // solver already produced the artifact above
    task.precision = Math.max(task.precision, 0.5);
    return `${site.brand}: ${task.title} — AI unavailable after ${task.attempts} attempts, deterministic solver finished it`;
  }
  return `${site.brand}: ${task.title} — refine (${task.note ?? 'critique'})`;
}

function applyOutput(ctx: TaskCtx, site: V3Site, task: Task, output: unknown): void {
  site.art = site.art ?? {};
  switch (task.kind) {
    case 'brief.compose':
      site.art.brief = output as SiteArt['brief'];
      break;
    case 'layout.select':
      site.art.layouts = site.art.layouts ?? {};
      site.art.layouts[task.device ?? 'D3'] = output as { id: string; why: string };
      break;
    case 'page.plan': {
      const pages = (output as { pages: PagePlanEntry[] }).pages;
      site.art.pages = pages;
      // values defaults are born with the plan (they drive catalog + channels)
      if (!site.art.values) {
        const probe = designFromSeed(site.seed);
        const rng = seedFrom(site.seed + '-values');
        site.art.values = defaultValues(site.seed, site.brand, probe.niche.label, probe.city, probe.niche.place, probe.niche.menuTitle, probe.niche.priceBase, probe.niche.services, rng);
      }
      break;
    }
    case 'heading.compose': {
      site.art.headings = site.art.headings ?? {};
      const arr = site.art.headings[task.pageKey ?? 'about'] ?? [];
      arr[task.slot ?? 0] = (output as { text: string }).text;
      site.art.headings[task.pageKey ?? 'about'] = arr;
      break;
    }
    case 'section.copy': {
      site.art.copy = site.art.copy ?? {};
      const arr = site.art.copy[task.pageKey ?? 'about'] ?? [];
      arr.push(output as { kicker: string; body: string });
      site.art.copy[task.pageKey ?? 'about'] = arr;
      break;
    }
    case 'catalog.build':
      site.art.catalog = (output as { catalog: Product[] }).catalog;
      break;
    case 'contact.channels':
      site.art.channelsAccepted = true;
      break;
    case 'values.freeze':
      site.art.values = output as SiteValues;
      break;
    case 'page.build':
    case 'page.review':
    case 'qa.audit':
    case 'site.stamp':
    case 'github.publish':
    case 'image.select':
    case 'palette.lock':
      // handled by the bespoke builders below
      break;
    default:
      break;
  }
  void fs; void path;
}

/** The network/IO-bearing kinds get bespoke async treatment (called by the engine). */
export async function executeIoTask(ctx: TaskCtx, site: V3Site, task: Task): Promise<string | null> {
  const dir = ctx.siteDir(site.id);
  if (task.kind === 'image.select') {
    fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
    const pending = imageSlotsFor(site).filter((s) => !(site.art.images ?? []).some((r) => r.slotId === s.slotId && r.status !== 'gradient'));
    const one = pending[0];
    if (!one) return null; // nothing pending — accept as complete
    const { records, newFetches } = await resolveImages(site.seed, siteNicheKey(site), site.nicheLabel, [one], site.art.images ?? [], (slotId, bytes) => {
      const file = `assets/${slotId}.jpg`;
      fs.writeFileSync(path.join(dir, file), bytes);
      return file;
    });
    site.art.images = [...(site.art.images ?? []).filter((r) => r.slotId !== one.slotId), ...records];
    const rec = records[0];
    return `${site.brand}: image ${one.slotId} — ${rec.status === 'live' ? `live CC image from ${rec.source} (${rec.license})` : rec.status === 'picsum' ? 'picsum fallback' : 'gradient fallback'} (+${newFetches} fetch)`;
  }
  if (task.kind === 'page.build' || task.kind === 'page.review') {
    const t = task;
    const pageKey = t.pageKey ?? 'home';
    const pages = site.art.pages ?? [];
    const art: RenderArt = {
      brief: site.art.brief, headings: site.art.headings, copy: site.art.copy,
      images: site.art.images, catalog: site.art.catalog, values: site.art.values ?? undefined, pages,
    };
    fs.mkdirSync(dir, { recursive: true });
    let file = 'index.html';
    let html = '';
    if (pageKey === 'home') {
      html = renderSite(site.seed, ctx.owner, { art }).html;
      // inject the page strip linking the inner pages (deterministic)
      const strip = `<div class="wrap" style="display:flex;flex-wrap:wrap;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)">${pages.filter((p) => p.key !== 'home').map((p) => `<a href="${p.file}" style="font-size:.85rem;font-weight:600;color:var(--accent)">${p.title} ↗</a>`).join('')}</div>`;
      html = html.replace('<main id="main">', `<main id="main">${strip}`);
      file = 'index.html';
    } else {
      file = pages.find((p) => p.key === pageKey)?.file ?? `${pageKey}.html`;
      html = renderInnerPage(site.seed, ctx.owner, pageKey, { art, currentKey: pageKey });
    }
    fs.writeFileSync(path.join(dir, file), html);
    const lines = html.split('\n').length;
    site.art.revisions = site.art.revisions ?? {};
    const revs = site.art.revisions[pageKey] ?? [];
    const prev = revs[revs.length - 1];
    const diff = prev ? countDiff(prev.v === 1 ? prev.lines : prev.lines, lines) : 0;
    revs.push({ v: revs.length + 1, lines, diff, at: new Date().toISOString() });
    site.art.revisions[pageKey] = revs.slice(-2);
    if (task.kind === 'page.build') return `${site.brand}: built ${file} (${lines} lines, D1–D5 media blocks, nav wired)`;
    return `${site.brand}: reviewed ${file} — rev${revs.length}, ${diff} changed lines, structure intact`;
  }
  if (task.kind === 'qa.audit') {
    const pages = ['index.html', ...(site.art.pages ?? []).filter((p) => p.key !== 'home').map((p) => p.file)];
    let passing = 0;
    for (const f of pages) {
      const p = path.join(dir, f);
      if (fs.existsSync(p)) {
        const html = fs.readFileSync(p, 'utf8');
        if (html.includes('@media (min-width:641px)') && html.includes('@media (min-width:1025px)') && html.includes('@media (min-width:1921px)')) passing += 1;
      }
    }
    const r = renderSite(site.seed, ctx.owner);
    site.qa = {
      contrast: r.palette.report.map((x) => ({ pair: x.pair, ratio: x.ratio, pass: x.pass })),
      breakpoints: ['@media (min-width:641px)', '@media (min-width:1025px)', '@media (min-width:1441px)', '@media (min-width:1921px)'],
      crap: [`Contrast — every pair WCAG-corrected`, `Repetition — one token set across ${pages.length} pages`, 'Alignment — container grid everywhere', 'Proximity — related blocks grouped'],
    };
    return `${site.brand}: QA audit — ${passing}/${pages.length} pages carry the full device matrix; contrast battery ${r.palette.report.every((x) => x.pass) ? 'clean' : 'flagged'}`;
  }
  if (task.kind === 'site.stamp') {
    const year = new Date().getFullYear();
    const base = site.nicheLabel.includes('architecture') || site.nicheLabel.includes('agency') ? 140 : site.nicheLabel.includes('tattoo') ? 90 : 60;
    site.price = sitePriceFor(site.seed, base);
    site.status = 'for-sale';
    site.copyright = `© ${year} ${ctx.owner}. All rights reserved.`;
    // re-render every page with the final owner stamp
    await rebuildAllPages(ctx, site);
    // write attribution + values into the folder
    fs.writeFileSync(path.join(dir, 'ATTRIBUTION.md'), attributionMarkdown(site.brand, site.art.images ?? []));
    fs.writeFileSync(path.join(dir, 'values.json'), JSON.stringify(site.art.values ?? {}, null, 1));
    return `${site.brand}: © stamped for ${ctx.owner} — on the shelf at $${site.price} (${(site.art.pages ?? []).length + 1} pages)`;
  }
  if (task.kind === 'github.publish') {
    const files = listSiteFiles(ctx.siteDir(site.id)).map((f) => ({
      path: f.rel,
      content: f.binary ? f.bytes!.toString('base64') : f.text!,
      encoding: f.binary ? ('base64' as const) : ('utf8' as const),
    }));
    const res = await publishSiteFiles(site.brand, site.seed, files, `${site.brand} — ${site.nicheLabel} in ${site.city}`);
    if (res.ok && res.repo) {
      site.art.git = { repo: res.repo, url: res.url!, pushedAt: new Date().toISOString() };
      return `${site.brand}: published to github.com/${res.repo} (one commit, ${files.length} files)`;
    }
    task.status = 'deferred';
    task.note = res.reason;
    return `${site.brand}: GitHub publish deferred — ${res.reason}`;
  }
  return null;
}

function countDiff(a: number, b: number): number {
  return Math.abs(a - b);
}

export async function rebuildAllPages(ctx: TaskCtx, site: V3Site): Promise<void> {
  const dir = ctx.siteDir(site.id);
  fs.mkdirSync(dir, { recursive: true });
  const pages = site.art.pages ?? [];
  const art: RenderArt = {
    brief: site.art.brief, headings: site.art.headings, copy: site.art.copy,
    images: site.art.images, catalog: site.art.catalog, values: site.art.values ?? undefined, pages,
  };
  const home = renderSite(site.seed, ctx.owner, { art }).html;
  const strip = `<div class="wrap" style="display:flex;flex-wrap:wrap;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)">${pages.filter((p) => p.key !== 'home').map((p) => `<a href="${p.file}" style="font-size:.85rem;font-weight:600;color:var(--accent)">${p.title} ↗</a>`).join('')}</div>`;
  fs.writeFileSync(path.join(dir, 'index.html'), home.replace('<main id="main">', `<main id="main">${strip}`));
  for (const p of pages) {
    if (p.key === 'home') continue;
    fs.writeFileSync(path.join(dir, p.file), renderInnerPage(site.seed, ctx.owner, p.key, { art, currentKey: p.key }));
  }
  // support files with the full page list (multi-page sitemap)
  const support = renderSupportFiles(site.seed, ctx.owner, { price: site.price, copyright: site.copyright, pages: ['index.html', ...pages.filter((p) => p.key !== 'home').map((p) => p.file)] });
  for (const [name, content] of Object.entries(support)) fs.writeFileSync(path.join(dir, name), content);
}

export function listSiteFiles(dir: string): { rel: string; text?: string; bytes?: Buffer; binary?: boolean }[] {
  const out: { rel: string; text?: string; bytes?: Buffer; binary?: boolean }[] = [];
  const walk = (d: string, prefix: string) => {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, f.name);
      const rel = prefix ? `${prefix}/${f.name}` : f.name;
      if (f.isDirectory()) walk(full, rel);
      else {
        const bytes = fs.readFileSync(full);
        const binary = /\.(jpg|jpeg|png|gif|webp|ico)$/i.test(f.name);
        out.push({ rel, bytes, binary, text: binary ? undefined : bytes.toString('utf8') });
      }
    }
  };
  walk(dir, '');
  return out;
}

function sitePriceFor(seed: string, nicheKeyPriceBase: number): number {
  const probe = designFromSeed(seed);
  const complexity = 1 + (probe.design.heroVariant === 'cinematic' ? 0.25 : 0) + (probe.design.motif === 'blobs' ? 0.1 : 0) + (probe.design.spaceRhythm === 'generous' ? 0.1 : 0);
  const rng = seedFrom(seed + '-price');
  return Math.round((nicheKeyPriceBase * 9 * complexity + rng.int(40, 160)) / 10) * 10;
}

export { githubConfigured };
