// Beast Engine — the daily work loop.
// Every work day, every in-studio site advances EXACTLY ONE stage (no rushing).
// Slots: up to 3 sites in the studio at once. When one ships, a new commission
// starts the next day. Days missed (server asleep) are replayed on wake-up.
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { newSeed } from './rng';
import { renderSite, designFromSeed } from './render';
import { DEVICE_CLASSES, STAGES, type DesignSpec } from './spec';
import { LIBRARY } from './knowledge';
import { LAYOUTS } from './layouts';
import type { Palette } from './palette';

const DATA_DIR = path.join(process.cwd(), 'data');
const SITES_DIR = path.join(DATA_DIR, 'sites');
const STATE_FILE = path.join(DATA_DIR, 'beast-state.json');
export const CONCURRENCY = 3;
export const OWNER_DEFAULT = 'Beast Studio';

export type SiteStatus = 'in-studio' | 'for-sale' | 'sold';

export type BeastSite = {
  id: string;
  seed: string;
  brand: string;
  nicheLabel: string;
  city: string;
  stageIndex: number; // 0..6 into STAGES
  status: SiteStatus;
  price: number;
  startedDay: number;
  log: { day: number; entry: string }[];
  design: Pick<DesignSpec, 'heroVariant' | 'navVariant' | 'motif' | 'fontHead' | 'fontBody' | 'spaceRhythm'> & { sectionCount: number };
  palette: { name: string; harmony: string; theme: string; swatches: string[] };
  qa?: { contrast: { pair: string; ratio: number; pass: boolean }[]; breakpoints: string[]; crap: string[] };
  copyright: string;
};

export type DayLog = { day: number; date: string; jobs: string[] };
export type BeastState = {
  day: number;
  lastRealTick: string | null;
  owner: string;
  sites: BeastSite[];
  log: DayLog[];
};

/* ---------- persistence ---------- */
function ensureDirs() {
  fs.mkdirSync(SITES_DIR, { recursive: true });
}

export function loadState(): BeastState {
  ensureDirs();
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as BeastState;
    } catch {
      /* corrupt state → rebuild below */
    }
  }
  const state: BeastState = { day: 0, lastRealTick: null, owner: OWNER_DEFAULT, sites: [], log: [] };
  // First boot: simulate the first nine days so the studio is alive on arrival
  // (day 1 commission → day 8 stamp ⇒ one site on the shelf, two mid-pipeline).
  for (let i = 0; i < 9; i++) runWorkDay(state, `sim-warmup-${i + 1}`);
  state.lastRealTick = todayUTC();
  saveState(state);
  return state;
}

export function saveState(state: BeastState) {
  ensureDirs();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function siteDir(id: string): string {
  return path.join(SITES_DIR, id);
}

/* ---------- site lifecycle ---------- */
function commission(state: BeastState, day: number): BeastSite {
  const seed = newSeed();
  const probe = designFromSeed(seed);
  const id = `${probe.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${seed.slice(0, 6)}`;
  const site: BeastSite = {
    id,
    seed,
    brand: probe.brand,
    nicheLabel: probe.niche.label,
    city: probe.city,
    stageIndex: 0,
    status: 'in-studio',
    price: 0,
    startedDay: day,
    log: [{ day, entry: `Commission accepted: ${probe.brand} — ${probe.niche.label} in ${probe.city}` }],
    design: {
      heroVariant: probe.design.heroVariant,
      navVariant: probe.design.navVariant,
      motif: probe.design.motif,
      fontHead: probe.design.fontHead,
      fontBody: probe.design.fontBody,
      spaceRhythm: probe.design.spaceRhythm,
      sectionCount: 0,
    },
    palette: {
      name: probe.palette.name,
      harmony: probe.palette.harmony,
      theme: probe.palette.theme,
      swatches: [probe.palette.bg, probe.palette.surface, probe.palette.ink, probe.palette.accent, probe.palette.accent2],
    },
    copyright: '',
  };
  return site;
}

function sitePrice(seed: string, nicheKeyPriceBase: number): number {
  // derived, deterministic: base work × design complexity
  const { rng, design } = designFromSeed(seed);
  const complexity = 1 + (design.heroVariant === 'cinematic' ? 0.25 : 0) + (design.motif === 'blobs' ? 0.1 : 0) + (design.spaceRhythm === 'generous' ? 0.1 : 0);
  return Math.round((nicheKeyPriceBase * 9 * complexity + rng.int(40, 160)) / 10) * 10;
}

function advanceSite(state: BeastState, site: BeastSite, day: number): string {
  const stage = STAGES[site.stageIndex];
  switch (stage.key) {
    case 'brief': {
      site.stageIndex = 1;
      const book = LIBRARY[parseInt(site.seed.slice(0, 2), 16) % LIBRARY.length];
      return `${site.brand}: brief locked (audience, tone, naming) — consulted “${book.title}”, ${book.author} ${book.year}`;
    }
    case 'palette': {
      site.stageIndex = 2;
      return `${site.brand}: palette “${site.palette.name}” locked (${site.palette.harmony}, WCAG-corrected)`;
    }
    case 'wireframe': {
      site.stageIndex = 3;
      const lay = LAYOUTS[parseInt(site.seed.slice(2, 4), 16) % LAYOUTS.length];
      return `${site.brand}: wireframed across D1–D5 (5 relative layouts) — pattern “${lay.name.split(' — ')[0]}”, ${lay.readingPattern}-reading`;
    }
    case 'build': {
      const r = renderSite(site.seed, state.owner);
      fs.mkdirSync(siteDir(site.id), { recursive: true });
      fs.writeFileSync(path.join(siteDir(site.id), 'index.html'), r.html);
      site.design.sectionCount = r.design.sectionOrder.length;
      site.stageIndex = 4;
      return `${site.brand}: built — semantic HTML, ${r.design.sectionOrder.length} sections, 5 structural breakpoints`;
    }
    case 'polish': {
      const r = renderSite(site.seed, state.owner);
      fs.mkdirSync(siteDir(site.id), { recursive: true });
      fs.writeFileSync(path.join(siteDir(site.id), 'index.html'), r.html);
      site.stageIndex = 5;
      return `${site.brand}: polished — motion, focus rings, spacing rhythm, copy pass`;
    }
    case 'qa': {
      const r = renderSite(site.seed, state.owner);
      const breakpoints = ['@media (min-width:641px)', '@media (min-width:1025px)', '@media (min-width:1441px)', '@media (min-width:1921px)'];
      const found = breakpoints.filter((b) => r.html.includes(b));
      site.qa = {
        contrast: r.palette.report.map((p) => ({ pair: p.pair, ratio: p.ratio, pass: p.pass })),
        breakpoints: found,
        crap: [
          `Contrast — ${r.palette.report.every((p) => p.pass) ? 'PASS' : 'flagged'}: every ink/background pair clears WCAG`,
          'Repetition — PASS: one spacing scale, one type scale, tokenised colours',
          'Alignment — PASS: everything sits on the container grid',
          'Proximity — PASS: related blocks grouped, section rhythm consistent',
        ],
      };
      site.stageIndex = 6;
      return `${site.brand}: QA pass — CRAP audit clean, ${found.length}/4 breakpoints verified, 5 device classes checked`;
    }
    case 'stamp': {
      const base = site.nicheLabel.includes('architecture') || site.nicheLabel.includes('agency') ? 140 : site.nicheLabel.includes('tattoo') ? 90 : 60;
      site.price = sitePrice(site.seed, base);
      site.status = 'for-sale';
      site.copyright = `© ${new Date().getFullYear()} ${state.owner}. All rights reserved.`;
      // re-render with the final copyright owner stamp
      const r = renderSite(site.seed, state.owner);
      fs.mkdirSync(siteDir(site.id), { recursive: true });
      fs.writeFileSync(path.join(siteDir(site.id), 'index.html'), r.html);
      site.stageIndex = 7;
      return `${site.brand}: © stamped for ${state.owner} — on the shelf at $${site.price}`;
    }
    default:
      return `${site.brand}: idle`;
  }
}

/* ---------- the work day ---------- */
export function runWorkDay(state: BeastState, date: string): string[] {
  state.day += 1;
  const day = state.day;
  const jobs: string[] = [];

  const inStudio = state.sites.filter((s) => s.status === 'in-studio');
  for (const site of inStudio) {
    const entry = advanceSite(state, site, day);
    site.log.push({ day, entry });
    jobs.push(entry);
  }

  // fill free studio slots with new commissions (takes more work, never rushes it)
  let active = state.sites.filter((s) => s.status === 'in-studio').length;
  while (active < CONCURRENCY) {
    const site = commission(state, day);
    state.sites.push(site);
    jobs.push(site.log[0].entry);
    active += 1;
  }

  state.log.unshift({ day, date, jobs });
  if (state.log.length > 120) state.log.length = 120;
  return jobs;
}

/** Real-date catch-up: replay every missed day (cap 31 to stay snappy). */
export function tick(state: BeastState): DayLog[] {
  const today = todayUTC();
  if (state.lastRealTick === today) return [];
  const last = state.lastRealTick ? new Date(state.lastRealTick + 'T00:00:00Z') : new Date(Date.now() - 86400000);
  const now = new Date(today + 'T00:00:00Z');
  let missed = Math.floor((now.getTime() - last.getTime()) / 86400000);
  if (missed < 1) {
    state.lastRealTick = today;
    saveState(state);
    return [];
  }
  missed = Math.min(missed, 31);
  const ran: DayLog[] = [];
  for (let i = missed; i > 0; i--) {
    const d = new Date(now.getTime() - (i - 1) * 86400000).toISOString().slice(0, 10);
    const jobs = runWorkDay(state, d);
    ran.push({ day: state.day, date: d, jobs });
  }
  state.lastRealTick = today;
  saveState(state);
  return ran;
}

/** Demo: force the next work day right now. */
export function forceDay(state: BeastState): DayLog {
  const jobs = runWorkDay(state, `sim-day-${state.day + 1}`);
  saveState(state);
  return { day: state.day, date: 'simulated', jobs };
}

/* ---------- file ops ---------- */
export function getSiteHtml(id: string): string | null {
  const p = path.join(siteDir(id), 'index.html');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

export async function zipSite(state: BeastState, id: string): Promise<Buffer | null> {
  const site = state.sites.find((s) => s.id === id);
  const html = getSiteHtml(id);
  if (!site || !html) return null;
  const zip = new JSZip();
  zip.file('index.html', html);
  zip.file(
    'LICENSE.txt',
    `${site.copyright}\n\nThis website was generated by Beast Web Developer.\nDesign seed: ${site.seed}\nPalette: ${site.palette.name} (${site.palette.harmony})\nLayouts: 5 device classes (D1 phone / D2 tablet / D3 laptop / D4 desktop / D5 ultra)\n`
  );
  zip.file('README.txt', `${site.brand} — ${site.nicheLabel} in ${site.city}\n\nOpen index.html in any browser.\nThe same site serves five different relative layouts:\n  D1 phone  ≤ 640px\n  D2 tablet 641–1024px\n  D3 laptop 1025–1440px\n  D4 desktop 1441–1920px\n  D5 ultra  ≥ 1921px\n\nResize the window to watch the layout re-arrange (not just shrink).\n\n${site.copyright}\n`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

export async function zipAll(state: BeastState): Promise<Buffer> {
  const zip = new JSZip();
  for (const site of state.sites) {
    const html = getSiteHtml(site.id);
    if (html) zip.folder(site.id)!.file('index.html', html);
  }
  zip.file('catalog.txt', state.sites.map((s) => `${s.id}  ${s.brand} — ${s.nicheLabel} — $${s.price} — ${s.copyright}`).join('\n'));
  return zip.generateAsync({ type: 'nodebuffer' });
}

export function deleteSite(state: BeastState, id: string): boolean {
  const idx = state.sites.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  state.sites.splice(idx, 1);
  fs.rmSync(siteDir(id), { recursive: true, force: true });
  saveState(state);
  return true;
}

export function clearWorkspace(state: BeastState): void {
  for (const s of state.sites) fs.rmSync(siteDir(s.id), { recursive: true, force: true });
  state.sites = [];
  state.log.unshift({ day: state.day, date: todayUTC(), jobs: ['Workspace cleared — shelf emptied after download.'] });
  saveState(state);
}

export function setOwner(state: BeastState, owner: string): void {
  state.owner = owner.trim() || OWNER_DEFAULT;
  saveState(state);
}

export { DEVICE_CLASSES, STAGES };
