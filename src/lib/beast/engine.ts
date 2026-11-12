// Beast Engine v3 — the daily work loop, now on the micro-task graph.
// One site advances EXACTLY ONE micro-task per work day (the owner's law:
// "we give it 1 task so that it perfects it"). Missed days replay automatically.
// v3 fresh start: no simulated placeholder sites — the studio opens EMPTY and
// earns its shelf task by task. Finished sites archive to their own GitHub repo
// (no database needed — the owner's question, answered in storage.ts).
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { newSeed } from './rng';
import { renderSite, renderInnerPage, renderSupportFiles, type RenderArt } from './render';
import { DEVICE_CLASSES, STAGES, type DesignSpec } from './spec';
import { LAYOUTS } from './layouts';
import type { Palette } from './palette';
import {
  planInitialTasks, runNextTask, executeIoTask, listSiteFiles, rebuildAllPages,
  type Task, type TaskStatus, type SiteArt, type TaskCtx,
} from './tasks';
import { validateValues } from './values';
import { pushStudioState, loadStudioState, githubConfigured, VAULT_REPO } from './storage';
import type { AiTurn } from './ai';

function DATA_DIR(): string {
  return process.env.BEAST_DATA_DIR || path.join(process.cwd(), 'data');
}
const SITES_DIR = () => path.join(DATA_DIR(), 'sites');
const STATE_FILE = () => path.join(DATA_DIR(), 'beast-state.json');
export const CONCURRENCY = 3;
export const OWNER_DEFAULT = 'Beast Studio';
export const ENGINE_VERSION = 3;

export type SiteStatus = 'in-studio' | 'for-sale' | 'sold';

export type BeastSite = {
  id: string;
  seed: string;
  brand: string;
  nicheLabel: string;
  city: string;
  stageIndex: number;
  status: SiteStatus;
  price: number;
  startedDay: number;
  log: { day: number; entry: string }[];
  design: Pick<DesignSpec, 'heroVariant' | 'navVariant' | 'motif' | 'fontHead' | 'fontBody' | 'spaceRhythm'> & { sectionCount: number };
  palette: { name: string; harmony: string; theme: string; swatches: string[] };
  qa?: { contrast: { pair: string; ratio: number; pass: boolean }[]; dark?: { pair: string; ratio: number; pass: boolean }[]; breakpoints: string[]; crap: string[] };
  copyright: string;
  art: SiteArt;
  tasks: Task[];
};

export type DayLog = { day: number; date: string; jobs: string[] };
export type BeastState = {
  version: number;
  day: number;
  lastRealTick: string | null;
  owner: string;
  sites: BeastSite[];
  log: DayLog[];
  transcript: AiTurn[];
};

/* ---------- persistence ---------- */
function ensureDirs() {
  fs.mkdirSync(SITES_DIR(), { recursive: true });
}

export function loadState(): BeastState {
  ensureDirs();
  if (fs.existsSync(STATE_FILE())) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')) as BeastState;
      if (parsed.version === ENGINE_VERSION) return parsed;
      // pre-v3 state (placeholder sim sites) → fresh start per owner directive
    } catch { /* corrupt → rebuild */ }
  }
  const state: BeastState = {
    version: ENGINE_VERSION, day: 0, lastRealTick: null, owner: OWNER_DEFAULT, sites: [], log: [],
    transcript: [],
  };
  if (process.env.BEAST_WARMUP === '1') {
    // opt-in demo warm-up (kept for the Test Center sandbox scenario)
    state.log.push({ day: 0, date: todayUTC(), jobs: ['Warm-up enabled — placeholder sim days will be replayed.'] });
  } else {
    state.log.push({ day: 0, date: todayUTC(), jobs: ['v3 fresh start — the studio opens empty and earns its shelf task by task.'] });
  }
  state.lastRealTick = todayUTC();
  saveState(state);
  return state;
}

let vaultPushBusy = false;
let lastPushedState = '';

export function saveState(state: BeastState) {
  ensureDirs();
  const json = JSON.stringify(state, null, 1);
  fs.writeFileSync(STATE_FILE(), json);
  // Durable memory: the vault gets every state change (one small commit).
  // Fire-and-forget — the studio never waits on the network, and a missing
  // token costs nothing (deferred without an API call).
  if (githubConfigured() && !vaultPushBusy && json !== lastPushedState) {
    vaultPushBusy = true;
    lastPushedState = json;
    void pushStudioState(json)
      .catch(() => { /* vault unreachable — local file remains the truth */ })
      .finally(() => { vaultPushBusy = false; });
  }
}

/**
 * Durable memory, other direction: on a cold boot (ephemeral disk wiped the
 * state file) adopt the vaulted studio state — the day counter, the task
 * ledger, the transcript all survive deploys and restarts. Site files are
 * rebuilt on demand from the frozen artifacts (self-heal in getSiteHtml).
 */
export async function adoptVaultState(
  state: BeastState,
  loader: () => Promise<string | null> = loadStudioState
): Promise<boolean> {
  if (state.day > 0 || state.sites.length > 0) return false; // local state exists — it wins
  try {
    const raw = await loader();
    if (!raw) return false;
    const vaulted = JSON.parse(raw) as BeastState;
    if (vaulted?.version !== ENGINE_VERSION || typeof vaulted.day !== 'number') return false;
    if (vaulted.day <= 0 && (vaulted.sites?.length ?? 0) === 0) return false; // nothing to adopt
    state.day = vaulted.day;
    state.lastRealTick = vaulted.lastRealTick ?? null;
    state.owner = vaulted.owner || state.owner;
    state.sites = vaulted.sites ?? [];
    state.log = vaulted.log ?? [];
    state.transcript = vaulted.transcript ?? [];
    saveState(state);
    state.log.unshift({ day: state.day, date: todayUTC(), jobs: [`Vault adopted — studio restored to DAY ${state.day} with ${state.sites.length} site(s) from ${VAULT_REPO}.`] });
    saveState(state);
    return true;
  } catch {
    return false;
  }
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function siteDir(id: string): string {
  return path.join(SITES_DIR(), id);
}

/* ---------- stage progress (derived from the task ledger) ---------- */
export function syncStage(site: BeastSite): void {
  const done = (k: Task['kind']) => site.tasks.some((t) => t.kind === k && t.status === 'accepted');
  const all = (k: Task['kind']) => site.tasks.filter((t) => t.kind === k);
  let stage = 0;
  if (done('brief.compose')) stage = 1;
  if (done('palette.lock')) stage = 2;
  if (all('layout.select').length > 0 && all('layout.select').every((t) => t.status === 'accepted')) stage = 3;
  if (all('page.build').length > 0 && all('page.build').every((t) => t.status === 'accepted')) stage = 4;
  if (all('page.review').length > 0 && all('page.review').every((t) => t.status === 'accepted')) stage = 5;
  if (done('qa.audit')) stage = 6;
  if (done('site.stamp')) stage = 7;
  site.stageIndex = stage;
}

/* ---------- site lifecycle ---------- */
function commission(state: BeastState, day: number): BeastSite {
  const seed = newSeed();
  const probe = renderSite(seed, state.owner);
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
    art: {},
    tasks: planInitialTasks(id),
  };
  return site;
}

function taskCtx(state: BeastState): TaskCtx {
  return {
    owner: state.owner,
    day: state.day,
    siteDir,
    logTurn: (turn) => {
      state.transcript.unshift(turn);
      if (state.transcript.length > 300) state.transcript.length = 300;
    },
  };
}

async function runSiteTask(state: BeastState, site: BeastSite): Promise<string> {
  const task = site.tasks.find((t) => t.status === 'queued');
  if (!task) {
    syncStage(site);
    return `${site.brand}: ledger complete — every micro-task accepted`;
  }
  const ctx = taskCtx(state);
  const IO_KINDS: Task['kind'][] = ['image.select', 'page.build', 'page.review', 'qa.audit', 'site.stamp', 'github.publish'];
  if (IO_KINDS.includes(task.kind)) {
    task.status = 'running';
    const msg = await executeIoTask(ctx, site, task);
    const st = task.status as TaskStatus; // executeIoTask may set 'deferred'
    if (st !== 'deferred') {
      task.status = 'accepted';
      task.precision = task.precision || 0.9;
      task.acceptedDay = ctx.day;
    }
    ctx.logTurn({
      id: `${task.id}-${Date.now()}`, taskId: task.id, taskTitle: task.title, provider: 'beast-io', mode: 'solver',
      promptTitle: task.why, envelope: task.rules.join(' | ').slice(0, 800),
      raw: msg ?? '(done)', interpretation: task.note ?? 'IO task executed', verdict: st === 'deferred' ? 'DEFER' : 'ACCEPT',
      action: st === 'deferred' ? 'deferred — will retry via Push button' : 'artifact written to disk',
      precision: task.precision, at: new Date().toISOString(),
    });
    syncStage(site);
    return msg ?? `${site.brand}: ${task.title} — done`;
  }
  const msg = await runNextTask(ctx, site);
  syncStage(site);
  return msg;
}

/* ---------- the work day ---------- */
export async function runWorkDay(state: BeastState, date: string): Promise<string[]> {
  state.day += 1;
  const day = state.day;
  const jobs: string[] = [];

  const inStudio = state.sites.filter((s) => s.status === 'in-studio');
  for (const site of inStudio) {
    const entry = await runSiteTask(state, site);
    site.log.push({ day, entry });
    jobs.push(entry);
  }

  let active = state.sites.filter((s) => s.status === 'in-studio').length;
  while (active < CONCURRENCY) {
    const site = commission(state, day);
    state.sites.push(site);
    jobs.push(site.log[0].entry);
    active += 1;
  }

  state.log.unshift({ day, date, jobs });
  if (state.log.length > 120) state.log.length = 120;
  saveState(state);
  return jobs;
}

/** Real-date catch-up: replay every missed day (cap 31 to stay snappy). */
export async function tick(state: BeastState): Promise<DayLog[]> {
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
    const jobs = await runWorkDay(state, d);
    ran.push({ day: state.day, date: d, jobs });
  }
  state.lastRealTick = today;
  saveState(state);
  return ran;
}

/** Force the next micro-task cycle right now (one task per site). */
export async function forceDay(state: BeastState): Promise<DayLog> {
  const jobs = await runWorkDay(state, `sim-day-${state.day + 1}`);
  return { day: state.day, date: 'simulated', jobs };
}

/* ---------- file ops ---------- */
const HTML_MARKER = 'Beast Web Developer';

export function getSiteHtml(id: string, page = 'index.html'): string | null {
  const state = loadState();
  const site = state.sites.find((s) => s.id === id);
  if (!site) return null;
  const dir = siteDir(id);
  const p = path.join(dir, page);
  const built = site.tasks.some((t) => t.kind === 'page.build' && t.status === 'accepted') || site.status === 'for-sale';
  if (built && !fs.existsSync(p)) {
    // self-heal: rebuild every page from the frozen artifacts (deterministic —
    // no awaits inside, the whole rebuild runs synchronously)
    void rebuildAllPages(taskCtx(state), site);
  }
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

export async function zipSite(state: BeastState, id: string): Promise<Buffer | null> {
  const site = state.sites.find((s) => s.id === id);
  if (!site) return null;
  const html = getSiteHtml(id);
  if (!html) return null;
  const zip = new JSZip();
  const files = listSiteFiles(siteDir(id));
  for (const f of files) zip.file(f.rel, f.binary ? f.bytes! : f.text!);
  if (!files.some((f) => f.rel === 'index.html')) zip.file('index.html', html);
  const support = renderSupportFiles(site.seed, state.owner, {
    price: site.price, copyright: site.copyright,
    pages: ['index.html', ...(site.art.pages ?? []).filter((p) => p.key !== 'home').map((p) => p.file)],
  });
  for (const [name, content] of Object.entries(support)) if (!files.some((f) => f.rel === name)) zip.file(name, content);
  zip.file(
    'LICENSE.txt',
    `${site.copyright}\n\nThis website was generated by Beast Web Developer v3.\nDesign seed: ${site.seed}\nPalette: ${site.palette.name} (${site.palette.harmony})\nPages: ${['index.html', ...(site.art.pages ?? []).filter((p) => p.key !== 'home').map((p) => p.file)].join(', ')}\nLayouts: 5 device classes (D1–D5), ${LAYOUTS.length}-layout library\nArchive: ${site.art.git ? `github.com/${site.art.git.repo}` : 'not published yet'}\n`
  );
  zip.file('README.txt', `${site.brand} — ${site.nicheLabel} in ${site.city}\n\nOpen index.html in any browser. Inner pages: ${(site.art.pages ?? []).filter((p) => p.key !== 'home').map((p) => p.file).join(', ')}.\nThe same site serves five different relative layouts:\n  D1 phone  ≤ 640px\n  D2 tablet 641–1024px\n  D3 laptop 1025–1440px\n  D4 desktop 1441–1920px\n  D5 ultra  ≥ 1921px\n\nEvery fact (phones, socials, products, address) lives in values.json — edit it and re-render.\n\n${site.copyright}\n`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

export async function zipAll(state: BeastState): Promise<Buffer> {
  const zip = new JSZip();
  for (const site of state.sites) {
    const folder = zip.folder(site.id)!;
    const files = listSiteFiles(siteDir(site.id));
    for (const f of files) folder.file(f.rel, f.binary ? f.bytes! : f.text!);
  }
  zip.file('catalog.txt', state.sites.map((s) => `${s.id}  ${s.brand} — ${s.nicheLabel} — $${s.price} — ${s.copyright} — ${s.art.git ? s.art.git.url : 'unpublished'}`).join('\n'));
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
  state.transcript = [];
  state.log.unshift({ day: state.day, date: todayUTC(), jobs: ['Workspace cleared — fresh start, the ledger is empty again.'] });
  saveState(state);
}

export async function setOwner(state: BeastState, owner: string): Promise<void> {
  state.owner = owner.trim() || OWNER_DEFAULT;
  const year = new Date().getFullYear();
  for (const s of state.sites) {
    if (s.status === 'for-sale' || s.status === 'sold') {
      s.copyright = `© ${year} ${state.owner}. All rights reserved.`;
      await rebuildAllPages(taskCtx(state), s);
    }
  }
  saveState(state);
}

/* ---------- v3 controls ---------- */
export async function runTaskNow(state: BeastState, siteId?: string): Promise<string[]> {
  const targets = state.sites.filter((s) => s.status === 'in-studio' && (!siteId || s.id === siteId));
  const jobs: string[] = [];
  for (const site of targets) {
    const entry = await runSiteTask(state, site);
    site.log.push({ day: state.day, entry });
    jobs.push(entry);
  }
  saveState(state);
  return jobs;
}

export async function setValues(state: BeastState, siteId: string, values: unknown): Promise<{ ok: boolean; issues?: string[] }> {
  const site = state.sites.find((s) => s.id === siteId);
  if (!site) return { ok: false, issues: ['site not found'] };
  const res = validateValues(values as never);
  if (!res.ok && res.issues.length === 0) return { ok: false, issues: ['invalid values'] };
  site.art.values = res.clean;
  // the owner edits once — every already-built page re-renders with the new facts
  if ((site.art.pages ?? []).length > 0) await rebuildAllPages(taskCtx(state), site);
  saveState(state);
  return { ok: true, issues: res.ok ? undefined : res.issues.map((i) => `${i.field}: ${i.problem}`) };
}

export async function pushToGithub(state: BeastState, siteId: string | 'all'): Promise<string[]> {
  const targets = state.sites.filter((s) => s.status === 'for-sale' && (siteId === 'all' || s.id === siteId));
  const jobs: string[] = [];
  const ctx = taskCtx(state);
  for (const site of targets) {
    const task = site.tasks.find((t) => t.kind === 'github.publish');
    if (task) {
      task.status = 'queued';
      task.note = undefined;
      jobs.push(await executeIoTask(ctx, site, task) ?? `${site.brand}: publish retried`);
      const st = task.status as TaskStatus;
      if (st !== 'deferred') task.status = 'accepted';
    }
  }
  saveState(state);
  return jobs;
}

export { DEVICE_CLASSES, LAYOUTS, STAGES };
