// Beast Engine v5 — the truthful work engine, reasoner-driven.
// No day theater: there is no simulated calendar, no "one task per day" law,
// no rush button. When the studio works it DRAINS the whole pending ledger —
// every queued micro-task executes, one after another, until nothing is left.
// Every log line is a real execution event with a real timestamp. Nothing is
// simulated, nothing is imaginary. Finished sites archive to their own GitHub
// repo (no database needed — the owner's question, answered in storage.ts).
// v5: the reasoner researches what people hate/want at runtime, assigns a
// different layout per page per device from the 100+-layout book, and the
// ledger carries 350–450+ real tasks per site (full functionality, real
// imagery, QA batteries, the 30MB floor).
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { newSeed } from './rng';
import { renderSite, renderSupportFiles } from './render';
import { DEVICE_CLASSES, STAGES, type DesignSpec } from './spec';
import { LAYOUTS } from './layouts';
import {
  planInitialTasks, runNextTask, executeIoTask, listSiteFiles, rebuildAllPages, IO_KINDS,
  type Task, type TaskStatus, type SiteArt, type TaskCtx,
} from './tasks';
import { validateValues } from './values';
import { pushStudioState, loadStudioState, githubConfigured, VAULT_REPO } from './storage';
import { layoutVariety } from './reasoner';
import type { AiTurn } from './ai';

function DATA_DIR(): string {
  return process.env.BEAST_DATA_DIR || path.join(process.cwd(), 'data');
}
const SITES_DIR = () => path.join(DATA_DIR(), 'sites');
const STATE_FILE = () => path.join(DATA_DIR(), 'beast-state.json');
export const CONCURRENCY = 3;
export const OWNER_DEFAULT = 'Beast Studio';
export const ENGINE_VERSION = 5;

export type SiteStatus = 'in-studio' | 'for-sale' | 'sold';

/** One real execution event — the actual log, never grouped by day. */
export type LogEvent = {
  at: string;                       // real ISO timestamp
  siteId?: string;
  taskTitle?: string;
  message: string;
  level: 'info' | 'done' | 'warn' | 'error';
};

export type BeastSite = {
  id: string;
  seed: string;
  brand: string;
  nicheLabel: string;
  city: string;
  stageIndex: number;
  status: SiteStatus;
  price: number;
  startedAt: string;                // real ISO timestamp of the commission
  log: { at: string; entry: string }[];
  design: Pick<DesignSpec, 'heroVariant' | 'navVariant' | 'motif' | 'fontHead' | 'fontBody' | 'spaceRhythm'> & { sectionCount: number };
  palette: { name: string; harmony: string; theme: string; swatches: string[] };
  qa?: { contrast: { pair: string; ratio: number; pass: boolean }[]; dark?: { pair: string; ratio: number; pass: boolean }[]; breakpoints: string[]; crap: string[] };
  copyright: string;
  art: SiteArt;
  tasks: Task[];
};

export type BeastState = {
  version: number;
  cycle: number;                    // workspace generation — increments on every clear
  startedAt: string;                // when this cycle began (real time)
  owner: string;
  sites: BeastSite[];
  log: LogEvent[];                  // the actual execution log, newest first
  transcript: AiTurn[];
};

/* ---------- persistence ---------- */
function ensureDirs() {
  fs.mkdirSync(SITES_DIR(), { recursive: true });
}

export function nowIso(): string {
  return new Date().toISOString();
}

function siteDir(id: string): string {
  return path.join(SITES_DIR(), id);
}

export function loadState(): BeastState {
  ensureDirs();
  if (fs.existsSync(STATE_FILE())) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')) as BeastState;
      if (parsed.version === ENGINE_VERSION) return parsed;
      // older state (v3 day-theater or earlier) → fresh start per owner directive
    } catch { /* corrupt → rebuild */ }
  }
  const state: BeastState = {
    version: ENGINE_VERSION, cycle: 1, startedAt: nowIso(), owner: OWNER_DEFAULT,
    sites: [], log: [], transcript: [],
  };
  logEvent(state, { message: 'v5 truthful reasoner engine — it researches what people hate first, then every site is built task by real task, logged as it happens.', level: 'info' });
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
 * state file) adopt the vaulted studio state — the ledger, the transcript all
 * survive deploys and restarts. Site files are rebuilt on demand from the
 * frozen artifacts (self-heal in getSiteHtml).
 */
export async function adoptVaultState(
  state: BeastState,
  loader: () => Promise<string | null> = loadStudioState
): Promise<boolean> {
  if (state.sites.length > 0 || state.log.length > 1) return false; // local state exists — it wins
  try {
    const raw = await loader();
    if (!raw) return false;
    const vaulted = JSON.parse(raw) as BeastState;
    if (vaulted?.version !== ENGINE_VERSION || !Array.isArray(vaulted.sites)) return false;
    if (vaulted.sites.length === 0 && (vaulted.log?.length ?? 0) <= 1) return false; // nothing to adopt
    state.cycle = vaulted.cycle ?? 1;
    state.startedAt = vaulted.startedAt ?? state.startedAt;
    state.owner = vaulted.owner || state.owner;
    state.sites = vaulted.sites ?? [];
    state.log = vaulted.log ?? [];
    state.transcript = vaulted.transcript ?? [];
    logEvent(state, { message: `Vault adopted — ${state.sites.length} site(s) and the full ledger restored from ${VAULT_REPO}.`, level: 'info' });
    saveState(state);
    return true;
  } catch {
    return false;
  }
}

/* ---------- the actual log ---------- */
export function logEvent(state: BeastState, ev: Omit<LogEvent, 'at'> & { at?: string }): void {
  state.log.unshift({ at: ev.at ?? nowIso(), siteId: ev.siteId, taskTitle: ev.taskTitle, message: ev.message, level: ev.level });
  if (state.log.length > 400) state.log.length = 400;
}

/* ---------- stage progress (derived from the task ledger) ---------- */
export function syncStage(site: BeastSite): void {
  const done = (k: Task['kind']) => site.tasks.some((t) => t.kind === k && t.status === 'accepted');
  const all = (k: Task['kind']) => site.tasks.filter((t) => t.kind === k);
  const allDone = (kinds: Task['kind'][]) => kinds.every((k) => all(k).length > 0 && all(k).every((t) => t.status === 'accepted'));
  let stage = 0;
  if (done('brief.compose')) stage = 1;
  if (done('palette.lock')) stage = 2;
  if (all('layout.select').length > 0 && all('layout.select').every((t) => t.status === 'accepted')) stage = 3;
  // build = every page, product page and journal post rendered
  if (allDone(['page.build', 'product.page', 'journal.post', 'asset.build'])) stage = 4;
  if (allDone(['page.review'])) stage = 5;
  if (done('qa.audit')) stage = 6;
  if (done('site.stamp')) stage = 7;
  site.stageIndex = stage;
}

/* ---------- site lifecycle ---------- */
export function commission(state: BeastState): BeastSite {
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
    startedAt: nowIso(),
    log: [],
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
  const entry = `Commission accepted: ${probe.brand} — ${probe.niche.label} in ${probe.city}`;
  site.log.push({ at: nowIso(), entry });
  state.sites.push(site);
  logEvent(state, { siteId: site.id, message: entry, level: 'info' });
  return site;
}

/** Keep the studio floor full: commission new sites until CONCURRENCY slots are taken. */
export function topUp(state: BeastState): number {
  let added = 0;
  while (state.sites.filter((s) => s.status === 'in-studio').length < CONCURRENCY) {
    commission(state);
    added += 1;
  }
  if (added > 0) saveState(state);
  return added;
}

/** Cold boot: an empty studio commissions its first batch immediately. */
export function bootStudio(state: BeastState): number {
  if (state.sites.length > 0) return 0;
  const added = topUp(state);
  if (added > 0) logEvent(state, { message: `Studio booted — ${added} site(s) commissioned and queued for real work.`, level: 'info' });
  return added;
}

function taskCtx(state: BeastState): TaskCtx {
  return {
    owner: state.owner,
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
  let msg: string;
  if (IO_KINDS.includes(task.kind)) {
    task.status = 'running';
    msg = (await executeIoTask(ctx, site, task)) ?? `${site.brand}: ${task.title} — done`;
    const st = task.status as TaskStatus; // executeIoTask may set 'deferred'
    if (st !== 'deferred') {
      task.status = 'accepted';
      task.precision = task.precision || 0.9;
      task.acceptedAt = nowIso();
    }
    ctx.logTurn({
      id: `${task.id}-${Date.now()}`, taskId: task.id, taskTitle: task.title, provider: 'beast-io', mode: 'solver',
      promptTitle: task.why, envelope: task.rules.join(' | ').slice(0, 800),
      raw: msg ?? '(done)', interpretation: task.note ?? 'IO task executed', verdict: st === 'deferred' ? 'DEFER' : 'ACCEPT',
      action: st === 'deferred' ? 'deferred — will retry via Publish button' : 'artifact written to disk',
      precision: task.precision, at: nowIso(),
    });
  } else {
    msg = await runNextTask(ctx, site);
  }
  syncStage(site);
  const done = task.status === 'accepted';
  const entry = msg;
  site.log.push({ at: nowIso(), entry });
  if (site.log.length > 40) site.log.length = 40;
  logEvent(state, {
    siteId: site.id, taskTitle: task.title, message: entry,
    level: done ? 'done' : task.status === 'deferred' ? 'warn' : 'info',
  });
  saveState(state);
  return msg;
}

/* ---------- the truthful work loop ---------- */
export type DrainReport = { executed: number; remaining: number; jobs: string[]; skipped?: boolean };

function countQueued(state: BeastState): number {
  return state.sites.reduce((n, s) => n + s.tasks.filter((t) => t.status === 'queued').length, 0);
}

/**
 * Work until the ledger is empty — the studio gives its all to every task,
 * however small. Round-robin across all in-studio sites so every commission
 * advances. Budgeted (maxTasks / maxMs) so a heartbeat slice or an HTTP
 * request can never run away; the remaining count is always honest.
 */
export async function runStudio(
  state: BeastState,
  opts: { maxTasks?: number; maxMs?: number } = {}
): Promise<DrainReport> {
  const t0 = Date.now();
  const maxTasks = opts.maxTasks ?? Number.POSITIVE_INFINITY;
  const maxMs = opts.maxMs ?? Number.POSITIVE_INFINITY;
  const jobs: string[] = [];
  let executed = 0;
  for (;;) {
    const workers = state.sites.filter((s) => s.status !== 'sold' && s.tasks.some((t) => t.status === 'queued'));
    if (workers.length === 0) break;
    if (executed >= maxTasks || Date.now() - t0 >= maxMs) break;
    // fairness: the site that has advanced the least goes next (round-robin)
    const worker = workers.reduce((a, b) =>
      (a.tasks.filter((t) => t.status === 'accepted').length <= b.tasks.filter((t) => t.status === 'accepted').length ? a : b));
    const before = worker.tasks.filter((t) => t.status === 'queued').length;
    const msg = await runSiteTask(state, worker);
    const after = worker.tasks.filter((t) => t.status === 'queued').length;
    if (after < before) executed += 1;
    jobs.push(msg);
  }
  saveState(state);
  return { executed, remaining: countQueued(state), jobs };
}

const g = globalThis as unknown as { __beastWorking?: boolean };

/** True while a drain is running in this process (the UI shows "working…"). */
export function isWorking(): boolean {
  return !!g.__beastWorking;
}

/** Exclusive drain — heartbeat and API share one mutex so work never doubles. */
export async function drainExclusive(
  state: BeastState,
  opts: { maxTasks?: number; maxMs?: number } = {}
): Promise<DrainReport> {
  if (g.__beastWorking) return { executed: 0, remaining: countQueued(state), jobs: [], skipped: true };
  g.__beastWorking = true;
  try {
    return await runStudio(state, opts);
  } finally {
    g.__beastWorking = false;
  }
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
  const variety = layoutVariety(site.art.pageLayouts);
  zip.file(
    'LICENSE.txt',
    `${site.copyright}\n\nThis website was generated by Beast Web Developer v5.\nDesign seed: ${site.seed}\nPalette: ${site.palette.name} (${site.palette.harmony})\nPages: ${['index.html', ...(site.art.pages ?? []).filter((p) => p.key !== 'home').map((p) => p.file)].join(', ')}\nLayouts: 5 device classes (D1–D5), ${LAYOUTS.length}-layout library — ${variety.distinct} distinct layouts used on this site\nReview corpus: ${site.art.findings?.length ?? 0} complaint themes researched by the reasoner\nArchive: ${site.art.git ? `github.com/${site.art.git.repo}` : 'not published yet'}\n`
  );
  zip.file('README.txt', `${site.brand} — ${site.nicheLabel} in ${site.city}\n\nOpen index.html in any browser. Everything is a real file:\n· ${site.art.pages?.length ?? 0} pages (content + functional: search, login/signup/account, admin, contacts directory, thank-you)\n· a detail page per product\n· journal posts, sitemap.html (every file, one view), offline.html, 404.html\n· manifest.json, robots.txt, sitemap.xml, values.json, ATTRIBUTION.txt\n\nThe same site serves five different relative layouts per device — and every page\ncarries its OWN layout per device (see the data-layout stamps in each page's CSS):\n  D1 phone  ≤ 640px\n  D2 tablet 641–1024px\n  D3 laptop 1025–1440px\n  D4 desktop 1441–1920px\n  D5 ultra  ≥ 1921px\n\nadmin.html edits the catalog live and exports values.json — hand it back to the\nstudio and every page re-renders.\n\nEvery fact (phones, socials, products, address) lives in values.json — edit it and re-render.\n\n${site.copyright}\n`);
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
  const [gone] = state.sites.splice(idx, 1);
  fs.rmSync(siteDir(id), { recursive: true, force: true });
  logEvent(state, { siteId: id, message: `${gone.brand} removed from the workspace — files deleted.`, level: 'warn' });
  saveState(state);
  return true;
}

export function clearWorkspace(state: BeastState): void {
  for (const s of state.sites) fs.rmSync(siteDir(s.id), { recursive: true, force: true });
  state.sites = [];
  state.transcript = [];
  state.cycle += 1;
  state.startedAt = nowIso();
  logEvent(state, { message: `Workspace cleared — cycle ${state.cycle} begins with an empty floor. Real logs continue below.`, level: 'warn' });
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
  logEvent(state, { message: `Copyright owner set to "${state.owner}" — every shelf page re-stamped.`, level: 'info' });
  saveState(state);
}

/* ---------- v4 controls ---------- */
export async function runTaskNow(state: BeastState, siteId?: string): Promise<string[]> {
  const targets = state.sites.filter((s) => s.status === 'in-studio' && (!siteId || s.id === siteId));
  const jobs: string[] = [];
  for (const site of targets) {
    jobs.push(await runSiteTask(state, site));
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
  logEvent(state, { siteId: site.id, message: `${site.brand}: owner edited the values — ${res.ok ? 'all pages re-rendered with the new facts' : `warnings: ${res.issues.map((i) => i.field).join(', ')}`}.`, level: res.ok ? 'done' : 'warn' });
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
      logEvent(state, { siteId: site.id, taskTitle: task.title, message: jobs[jobs.length - 1], level: st === 'deferred' ? 'warn' : 'done' });
    }
  }
  saveState(state);
  return jobs;
}

export { DEVICE_CLASSES, LAYOUTS, STAGES };
