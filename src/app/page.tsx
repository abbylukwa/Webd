'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { LAYOUTS, specSummary } from '@/lib/beast/layouts';
import { LIBRARY } from '@/lib/beast/knowledge';
import {
  Download, Trash2, Eye, Play, Plus, Package, Github, Keyboard, Ruler, Palette as PaletteIcon,
  Layers, Infinity as InfinityIcon, BookOpen, ShieldCheck, MonitorSmartphone, FlaskConical, Gauge,
  Sparkles, Braces, CheckCircle2, Clock, Activity, ChevronDown, ExternalLink, History,
} from 'lucide-react';

/** repo html_url → its GitHub Pages site url (where the site is actually published) */
function pagesUrlOf(git?: { repo?: string; url?: string } | null): string | null {
  if (!git?.url) return null;
  const m = git.url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)/);
  return m ? `https://${m[1]}.github.io/${m[2]}/` : null;
}

/* ---------- types (mirror of API) ---------- */
type Device = {
  id: string; name: string; icon: string; range: string; previewWidth: number;
  nav: string; hero: string; featureCols: number; galleryCols: number; footer: string;
  container: string; gutter: string; typeNote: string; cta: string; extras: string[];
};
type Stage = { key: string; label: string; desc: string };
type Task = {
  id: string; kind: string; title: string; why: string; status: string;
  pageKey: string | null; device: string | null; detour: boolean; attempts: number;
  precision: number; note: string | null; rules: number; acceptedAt: string | null;
};
type Site = {
  id: string; brand: string; nicheLabel: string; city: string;
  stageIndex: number; status: 'in-studio' | 'for-sale' | 'sold'; price: number; startedAt: string;
  design: { heroVariant: string; navVariant: string; motif: string; fontHead: string; fontBody: string; spaceRhythm: string; sectionCount: number };
  palette: { name: string; harmony: string; theme: string; swatches: string[] };
  qa: null | { contrast: { pair: string; ratio: number; pass: boolean }[]; breakpoints: string[]; crap: string[] };
  copyright: string; log: { at: string; entry: string }[];
  git?: { repo: string; url: string; pushedAt: string } | null;
  tasks: Task[]; progress: number;
  taskCounts: { total: number; accepted: number; queued: number; deferred: number };
};
type LogEvent = { at: string; siteId?: string; taskTitle?: string; message: string; level: 'info' | 'done' | 'warn' | 'error' };
type Turn = { id: string; taskId: string; taskTitle: string; provider: string; mode: string; promptTitle: string; envelope: string; raw: string; interpretation: string; verdict: string; action: string; precision: number; at: string };
type Status = {
  version: number; cycle: number; startedAt: string; working: boolean;
  owner: string; concurrency: number; stages: Stage[]; devices: Device[];
  github: { configured: boolean }; ai: { enabled: boolean; pool?: { keys: number; ready: number; unusable: number; cooling: number; lastError: string | null } };
  workspace?: { bytes: number; budget: number; sites: number; maxSites: number };
  sites: Site[]; log: LogEvent[]; transcript: Turn[];
};
type TestResult = { id: string; group: string; feature: string; pass: boolean; detail: string };
type TestReport = { results: TestResult[]; passCount: number; failCount: number; durationMs: number };

/* ---------- tiny building blocks ---------- */
function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 ${className}`}>{children}</span>;
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <div className="flex gap-1">
      {colors.map((c, i) => (
        <span key={i} title={c} className="h-5 w-5 rounded-md border border-white/10" style={{ background: c }} />
      ))}
    </div>
  );
}

function StageTrack({ stages, site }: { stages: Stage[]; site: Site }) {
  const pct = Math.min(100, Math.round((site.stageIndex / stages.length) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Mono>{stages[Math.min(site.stageIndex, stages.length - 1)]?.label ?? 'shipped'}</Mono>
        <span className="font-mono text-[11px] text-lime-300">{site.progress}% · {site.taskCounts.accepted}/{site.taskCounts.total} tasks</span>
      </div>
      <Progress value={site.progress} className="h-1.5 bg-zinc-800 [&>[data-slot=progress-indicator]]:bg-lime-300" />
      <div className="flex flex-wrap gap-1">
        {stages.map((s, i) => (
          <span
            key={s.key}
            title={s.desc}
            className={`h-1.5 w-6 rounded-full ${i < site.stageIndex ? 'bg-lime-300' : i === site.stageIndex ? 'bg-amber-300 animate-pulse' : 'bg-zinc-700'}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- exact task lists — the ledger as it is ---------- */
function TaskRow({ t, brand }: { t: Task; brand: string }) {
  return (
    <li className="flex items-start gap-2 text-[13px] leading-snug">
      {t.status === 'accepted' ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-400" />
      ) : t.status === 'running' ? (
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-pulse text-amber-300" />
      ) : (
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
      )}
      <span className="min-w-0">
        <span className="text-zinc-200">{t.title}</span>
        <span className="ml-1.5 font-mono text-[10px] text-zinc-600">{brand} · {t.kind}</span>
        {t.status === 'accepted' && t.precision > 0 && (
          <span className="ml-1 font-mono text-[10px] text-lime-300/80">{Math.round(t.precision * 100)}%</span>
        )}
        {t.note && t.status !== 'accepted' && <span className="block text-[11px] text-zinc-500">{t.note}</span>}
      </span>
    </li>
  );
}

/* ---------- real log line ---------- */
function LogLine({ ev }: { ev: LogEvent }) {
  const color = ev.level === 'done' ? 'text-lime-300' : ev.level === 'warn' ? 'text-amber-300' : ev.level === 'error' ? 'text-red-400' : 'text-zinc-400';
  return (
    <li className="leading-snug">
      <span className="font-mono text-[10px] text-zinc-600">{new Date(ev.at).toLocaleTimeString()}</span>
      <span className={`ml-2 text-[13px] ${color}`}>{ev.message}</span>
    </li>
  );
}

/* ---------- mini wireframes per device class ---------- */
function Wire({ d }: { d: Device }) {
  const bar = 'rounded-[2px] bg-zinc-700';
  const acc = 'rounded-[2px] bg-lime-300';
  const box = 'rounded-[3px] border border-zinc-700 bg-zinc-900';
  return (
    <div className={`h-28 w-full ${box} p-1.5 flex flex-col gap-1`}>
      {d.id === 'D1' && (
        <>
          <div className="flex items-center justify-between"><div className={`${bar} h-1.5 w-8`} /><div className={`${acc} h-2 w-3`} /></div>
          <div className={`${acc} h-5 w-4/5 opacity-80`} />
          <div className={`${bar} h-1 w-3/5`} />
          <div className="grid flex-1 grid-cols-1 gap-1"><div className={`${box} flex-1`} /></div>
          <div className={`${acc} h-2.5 w-full`} />
        </>
      )}
      {d.id === 'D2' && (
        <>
          <div className="flex items-center gap-1"><div className={`${bar} h-1.5 w-8`} /><div className={`${bar} h-1 w-4`} /><div className={`${bar} h-1 w-4`} /><div className={`${acc} h-2 w-6 ml-auto`} /></div>
          <div className={`${acc} mx-auto h-4 w-3/5 opacity-80`} />
          <div className={`${bar} mx-auto h-1 w-2/5`} />
          <div className="grid flex-1 grid-cols-2 gap-1"><div className={box} /><div className={box} /></div>
        </>
      )}
      {d.id === 'D3' && (
        <>
          <div className="flex items-center gap-1.5"><div className={`${bar} h-1.5 w-8`} /><div className={`${bar} h-1 w-4`} /><div className={`${bar} h-1 w-4`} /><div className={`${bar} h-1 w-4`} /><div className={`${acc} h-2 w-6 ml-auto`} /></div>
          <div className="flex flex-1 gap-1"><div className="flex flex-[55] flex-col gap-1"><div className={`${acc} h-3 w-full opacity-80`} /><div className={`${bar} h-1 w-3/4`} /></div><div className={`${box} flex-[45]`} /></div>
          <div className="grid grid-cols-3 gap-1"><div className={box} /><div className={box} /><div className={box} /></div>
        </>
      )}
      {d.id === 'D4' && (
        <>
          <div className="flex items-center gap-1.5"><div className={`${bar} h-1.5 w-8`} /><div className={`${bar} h-1 w-4`} /><div className={`${bar} h-1 w-4`} /><div className={`${bar} h-1 w-4`} /><div className={`${acc} h-2 w-6 ml-auto`} /></div>
          <div className="flex flex-1 gap-1"><div className="flex flex-[55] flex-col gap-1"><div className={`${acc} h-3 w-full opacity-80`} /><div className="grid grid-cols-4 gap-1"><div className={`${bar} h-1`} /><div className={`${bar} h-1`} /><div className={`${bar} h-1`} /><div className={`${bar} h-1`} /></div></div><div className={`${box} flex-[45]`} /></div>
          <div className="grid grid-cols-4 gap-1"><div className={box} /><div className={box} /><div className={box} /><div className={box} /></div>
        </>
      )}
      {d.id === 'D5' && (
        <>
          <div className="flex items-center justify-center gap-2"><div className={`${bar} h-1 w-4`} /><div className={`${bar} h-1 w-4`} /><div className={`${bar} h-1 w-4`} /></div>
          <div className={`${acc} mx-auto h-6 w-2/3 opacity-80`} />
          <div className={`${bar} mx-auto h-1 w-1/3`} />
          <div className="grid flex-1 grid-cols-5 gap-1"><div className={box} /><div className={box} /><div className={box} /><div className={box} /><div className={box} /></div>
        </>
      )}
    </div>
  );
}

/* ---------- device preview with real iframe ---------- */
function DevicePreview({ siteId, width }: { siteId: string; width: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, (el.clientWidth - 8) / width));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  const H = 600;
  return (
    <div ref={stageRef} className="w-full overflow-hidden">
      <div className="mx-auto overflow-hidden rounded-xl border border-zinc-700 bg-white shadow-2xl" style={{ width: width * scale, height: H }}>
        <iframe
          src={`/api/beast/site/${siteId}`}
          title="site preview"
          style={{ width, height: H / scale, transform: `scale(${scale})`, transformOrigin: '0 0', border: 'none' }}
        />
      </div>
    </div>
  );
}

const VERDICT_STYLE: Record<string, 'default' | 'secondary' | 'destructive'> = { ACCEPT: 'default', REFINE: 'secondary', DEFER: 'destructive' };

/* ---------- main page ---------- */
export default function BeastPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [ownerDraft, setOwnerDraft] = useState('');
  const [previewSite, setPreviewSite] = useState<Site | null>(null);
  const [deviceIdx, setDeviceIdx] = useState(2); // default Laptop
  const [testReport, setTestReport] = useState<TestReport | null>(null);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/beast', { cache: 'no-store' });
      const data = (await res.json()) as Status;
      setStatus(data);
      setOwnerDraft(data.owner);
    } catch {
      toast({ title: 'Studio offline', description: 'Could not reach the beast. Try again.', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000); // live progress while the beast works
    return () => clearInterval(t);
  }, [refresh]);

  const act = async (body: Record<string, unknown>, okMsg: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/beast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      setStatus(data);
      setOwnerDraft(data.owner);
      toast({ title: okMsg, description: Array.isArray(data.jobs) && data.jobs.length ? data.jobs.slice(-2).join(' · ') : data.message });
    } catch {
      toast({ title: 'Action failed', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const runTests = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/beast/test', { cache: 'no-store' });
      const data = (await res.json()) as TestReport;
      setTestReport(data);
      toast({
        title: data.failCount === 0 ? `All ${data.passCount} features verified ✅` : `${data.failCount} of ${data.results.length} checks failed`,
        variant: data.failCount === 0 ? 'default' : 'destructive',
      });
    } catch {
      toast({ title: 'Test run failed', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const sites = status?.sites ?? [];
  const active = sites.filter((s) => s.status === 'in-studio');
  const shelf = sites.filter((s) => s.status === 'for-sale');
  const devices = status?.devices ?? [];
  const dev = devices[deviceIdx];

  // the exact ledger, exactly as it is
  const allTasks = sites.flatMap((s) => s.tasks.map((t) => ({ t, brand: s.brand })));
  const totalTasks = allTasks.length;
  const doneTasks = allTasks
    .filter((x) => x.t.status === 'accepted')
    .sort((a, b) => (b.t.acceptedAt ?? '').localeCompare(a.t.acceptedAt ?? ''));
  const pendingTasks = allTasks.filter((x) => x.t.status === 'queued' || x.t.status === 'running');
  const deferredCount = allTasks.filter((x) => x.t.status === 'deferred').length;
  const globalPct = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

  const infty = (() => {
    // honest-ish combinatorics, computed on-log scale to avoid overflow
    const log10 = (a: number) => Math.log10(a);
    const total =
      log10(360) + log10(6) + log10(3) + // hue × harmony × theme
      log10(11 * 9) + // font pairs
      log10(6 * 4 * 7 * 7 * 4 * 3 * 4 * 3) + // structural variants
      log10(6720) + // section orders
      log10(12 * 320) + // niche × brand grammar
      15 * log10(5); // copy fragment picks
    const days = Math.pow(10, total);
    const years = days / 365;
    const exp = Math.floor(Math.log10(years));
    return { exp, mantissa: Math.pow(10, Math.log10(years) - exp) };
  })();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 selection:bg-lime-300 selection:text-zinc-950">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-lime-300 font-black text-zinc-950">B</span>
            <div className="leading-tight">
              <div className="font-bold tracking-tight">BEAST<span className="text-lime-300">.</span>studio</div>
              <Mono>autonomous web developer</Mono>
            </div>
          </div>
          <Badge variant="outline" className={status?.working ? 'border-amber-300/40 font-mono text-amber-300' : 'border-zinc-700 font-mono text-zinc-400'}>
            {status === null ? '—' : status.working ? 'WORKING…' : 'IDLE'}
          </Badge>
          <Badge variant="outline" className="hidden font-mono text-zinc-400 sm:inline-flex">cycle {status?.cycle ?? '—'}</Badge>
          <Badge variant="outline" className="hidden font-mono text-zinc-400 md:inline-flex">{active.length}/{status?.concurrency ?? 3} in studio</Badge>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1">
              <span className="font-mono text-[11px] text-zinc-500">©</span>
              <Input
                value={ownerDraft}
                onChange={(e) => setOwnerDraft(e.target.value)}
                onBlur={() => ownerDraft.trim() && ownerDraft !== status?.owner && act({ action: 'setOwner', owner: ownerDraft }, 'Copyright owner saved')}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                placeholder="your name"
                className="h-7 w-36 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                aria-label="Copyright owner"
              />
            </div>
            <a href="/control" className="inline-flex">
              <Button size="sm" variant="outline" className="border-amber-800 bg-amber-950/40 font-semibold text-amber-300 hover:bg-amber-900/40">
                <Gauge className="h-4 w-4" /> <span className="hidden md:inline">Mission Control</span>
              </Button>
            </a>
            <Badge variant="outline" className="hidden border-zinc-700 font-mono text-[10px] text-zinc-400 md:inline-flex" title="live bytes on disk vs the 400MB workspace budget (4 sites × 100MB)">
              {((status?.workspace?.bytes ?? 0) / 1048576).toFixed(0)}/{((status?.workspace?.budget ?? 0) / 1048576).toFixed(0)}MB · {status?.workspace?.sites ?? 0}/{status?.workspace?.maxSites ?? 4} sites
            </Badge>
            <Button size="sm" className="bg-lime-300 font-bold text-zinc-950 hover:bg-lime-200" disabled={!shelf.length} onClick={() => { window.location.href = '/api/beast/zip-all'; toast({ title: 'Workspace packed — download started' }); }}>
              <Package className="h-4 w-4" /> <span className="hidden md:inline">Download all</span>
            </Button>
            <Button size="sm" variant="ghost" className="text-zinc-400 hover:bg-zinc-800" disabled={!status?.github.configured} onClick={() => act({ action: 'restore-vault' }, 'Vault restore — the last vaulted workspace is back on the floor')}>
              <History className="h-4 w-4" /> <span className="hidden md:inline">Restore</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-zinc-400 hover:bg-red-950 hover:text-red-300" disabled={!status?.sites.length}>
                  <Trash2 className="h-4 w-4" /> <span className="hidden md:inline">Clear</span>
                </Button>
              </AlertDialogTrigger>              <AlertDialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear the workspace?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    This removes every generated site from the shelf. Download them first — selling happens after you keep them. A new cycle starts immediately and the beast commissions fresh work.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-zinc-700 bg-transparent hover:bg-zinc-800">Keep</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-500" onClick={() => act({ action: 'clear' }, 'Workspace cleared — a new cycle begins')}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
        <Tabs defaultValue="studio" className="gap-6">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            <TabsTrigger value="studio" className="gap-1.5 data-[state=active]:bg-lime-300 data-[state=active]:text-zinc-950"><MonitorSmartphone className="h-4 w-4" /> Studio</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5 data-[state=active]:bg-lime-300 data-[state=active]:text-zinc-950"><Sparkles className="h-4 w-4" /> AI answers <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{status?.transcript.length ?? 0}</Badge></TabsTrigger>
            <TabsTrigger value="blueprints" className="gap-1.5 data-[state=active]:bg-lime-300 data-[state=active]:text-zinc-950"><Ruler className="h-4 w-4" /> Blueprints · D1–D5</TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1.5 data-[state=active]:bg-lime-300 data-[state=active]:text-zinc-950"><BookOpen className="h-4 w-4" /> Knowledge</TabsTrigger>
            <TabsTrigger value="tests" className="gap-1.5 data-[state=active]:bg-lime-300 data-[state=active]:text-zinc-950"><FlaskConical className="h-4 w-4" /> Test Center</TabsTrigger>
          </TabsList>

          {/* ================= STUDIO ================= */}
          <TabsContent value="studio" className="space-y-6">
            {/* live progress — the loading bar with the exact ledger */}
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-lg">Live progress — the whole ledger, exactly as it is</CardTitle>
                  <p className="mt-1 text-sm text-zinc-400">
                    The beast works continuously and exhausts every pending task. No simulated days — every line below is a real execution.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" className="border-lime-300/40 font-semibold text-lime-300 hover:bg-lime-300/10" disabled={busy} onClick={() => act({ action: 'work' }, 'Ledger drained — every pending task executed')}>
                    <Play className="h-4 w-4" /> <span className="hidden sm:inline">Work now</span>
                  </Button>
                  <Button size="sm" variant="outline" className="border-zinc-700 hover:bg-zinc-800" disabled={busy} onClick={() => act({ action: 'commission' }, 'New site commissioned')}>
                    <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Commission</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* the loading bar */}
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-zinc-200">
                      {doneTasks.length}/{totalTasks} tasks done
                      <span className="ml-2 font-normal text-zinc-500">· {pendingTasks.length} pending{deferredCount ? ` · ${deferredCount} deferred` : ''}</span>
                    </span>
                    <span className="font-mono text-lime-300">{globalPct}%</span>
                  </div>
                  <Progress value={globalPct} className="h-3 bg-zinc-800 [&>[data-slot=progress-indicator]]:bg-lime-300" />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {/* pending — exact order */}
                  <div className="space-y-2">
                    <Mono>pending tasks — in execution order</Mono>
                    <ScrollArea className="h-56 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      {pendingTasks.length === 0 && (
                        <p className="text-sm text-zinc-500">
                          {status?.working ? 'Working — draining the last pending tasks…' : 'Nothing pending. Commission a site to feed the beast.'}
                        </p>
                      )}
                      <ul className="space-y-1.5">
                        {pendingTasks.slice(0, 40).map((x, i) => (
                          <TaskRow key={x.t.id} t={x.t} brand={x.brand} />
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                  {/* done — newest first */}
                  <div className="space-y-2">
                    <Mono>done tasks — newest first</Mono>
                    <ScrollArea className="h-56 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      {doneTasks.length === 0 && <p className="text-sm text-zinc-500">No task finished yet — the first executions appear here the moment they happen.</p>}
                      <ul className="space-y-1.5">
                        {doneTasks.slice(0, 40).map((x) => (
                          <TaskRow key={x.t.id} t={x.t} brand={x.brand} />
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                </div>

                {/* the actual log */}
                <div className="space-y-2">
                  <Mono>the actual log — every execution, real timestamps</Mono>
                  <ScrollArea className="h-48 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    {status?.log.length ? (
                      <ul className="space-y-1">
                        {status.log.slice(0, 80).map((ev, i) => <LogLine key={i} ev={ev} />)}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-500">The log is empty — it fills as the beast executes.</p>
                    )}
                  </ScrollArea>
                </div>

                {/* in studio now */}
                <div className="space-y-3">
                  <Mono>in the studio now</Mono>
                  {active.length === 0 && <p className="text-sm text-zinc-500">Studio floor empty — press Commission to start a site.</p>}
                  <div className="grid gap-3 md:grid-cols-3">
                    {active.map((s) => (
                      <div key={s.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{s.brand}</div>
                            <div className="truncate text-[11px] text-zinc-500">{s.nicheLabel} · {s.city}</div>
                          </div>
                          <Swatches colors={s.palette.swatches} />
                        </div>
                        <StageTrack stages={status!.stages} site={s} />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* shelf */}
            <div>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">The shelf — for sale</h2>
                  <p className="text-sm text-zinc-400">Every site carries your © + year, five device layouts, and a licence file in the zip.</p>
                </div>
                <Mono>{shelf.length} sites</Mono>
              </div>
              {shelf.length === 0 && (
                <Card className="border-dashed border-zinc-800 bg-transparent">
                  <CardContent className="py-10 text-center text-sm text-zinc-500">
                    The shelf is empty. Sites land here the moment their pipeline finishes — the beast works continuously, or press “Work now” to drain everything immediately.
                  </CardContent>
                </Card>
              )}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {shelf.map((s) => (
                  <Card key={s.id} className="flex flex-col border-zinc-800 bg-zinc-900/60 transition-colors hover:border-lime-300/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="leading-tight">{s.brand}</CardTitle>
                          <p className="mt-0.5 text-[13px] text-zinc-400">{s.nicheLabel} · {s.city}</p>
                        </div>
                        <Badge className="bg-lime-300 font-mono text-zinc-950">${s.price}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      <Swatches colors={s.palette.swatches} />
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-300">{s.palette.name}</Badge>
                        <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-300">{s.design.heroVariant} hero</Badge>
                        <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-300">{s.design.fontHead} / {s.design.fontBody}</Badge>
                      </div>
                      <Separator className="bg-zinc-800" />
                      <p className="font-mono text-[11px] leading-relaxed text-zinc-500">{s.copyright}</p>
                      <div className="mt-auto flex gap-2">
                        {(() => {
                          const web = pagesUrlOf(s.git);
                          return web ? (
                            <a href={web} target="_blank" rel="noreferrer" title="open the published site" className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800">
                              <ExternalLink className="h-4 w-4" /> Web
                            </a>
                          ) : (
                            <Button size="sm" variant="outline" disabled title="not published yet — the Web link appears the moment the site is pushed to GitHub" className="shrink-0 border-zinc-800 text-zinc-600">
                              <ExternalLink className="h-4 w-4" /> Web
                            </Button>
                          );
                        })()}
                        <Button size="sm" className="flex-1 bg-lime-300 font-bold text-zinc-950 hover:bg-lime-200" onClick={() => { setPreviewSite(s); setDeviceIdx(2); }}>
                          <Eye className="h-4 w-4" /> Preview
                        </Button>
                        <Button size="sm" variant="outline" className="border-zinc-700 hover:bg-zinc-800" onClick={() => { window.location.href = `/api/beast/site/${s.id}/zip`; toast({ title: `${s.brand}.zip downloading` }); }}>
                          <Download className="h-4 w-4" /> ZIP
                        </Button>
                        <Button size="sm" variant="ghost" className="px-2 text-zinc-500 hover:bg-red-950 hover:text-red-300" onClick={() => { fetch(`/api/beast/site/${s.id}`, { method: 'DELETE' }).then(refresh); toast({ title: 'Site removed' }); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ================= AI ANSWERS ================= */}
          <TabsContent value="ai" className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-lime-300" /> AI answers — raw response, meaning, next action
                  <Badge variant="outline" className={status?.ai.enabled ? 'border-lime-300/40 font-mono text-lime-300' : 'border-zinc-700 font-mono text-zinc-400'}>
                    {status?.ai.enabled
                      ? `AI enabled · pool ${status.ai.pool ? `${status.ai.pool.ready} ready${status.ai.pool.unusable ? `, ${status.ai.pool.unusable} unusable` : ''}${status.ai.pool.cooling ? `, ${status.ai.pool.cooling} cooling` : ''}` : ''}`
                      : 'solver floor — no keys configured'}
                  </Badge>
                  {status?.ai.pool?.lastError && (
                    <Badge variant="outline" className="border-amber-300/40 font-mono text-[10px] text-amber-300/90" title={status.ai.pool.lastError}>
                      pool: {status.ai.pool.lastError.slice(0, 60)}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-zinc-400">
                  Every answer the studio receives, exactly as it arrived, with what it means and what happened next. Nothing enters a site without passing its gates.
                </p>
              </CardHeader>
            </Card>

            {!status?.ai.enabled && (
              <Card className="border-zinc-800 bg-zinc-900/60">
                <CardContent className="p-4 text-sm text-zinc-400">
                  No AI key vault is configured right now — every task runs on the deterministic solver floor and is logged honestly as such.
                  The moment keys are set (<span className="font-mono text-[12px] text-lime-300/80">BEAST_AI_VAULT</span>), live AI responses appear here.
                </CardContent>
              </Card>
            )}

            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader className="pb-2"><CardTitle className="text-base">Every answer, interpreted — newest first</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(status?.transcript.length ?? 0) === 0 && <p className="text-xs text-zinc-500">No turns yet — the first executions will land here as they happen.</p>}
                {status?.transcript.slice(0, 40).map((t) => (
                  <details key={t.id} className="group rounded-lg border border-zinc-800 p-3">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant={VERDICT_STYLE[t.verdict] ?? 'secondary'}>{t.verdict}</Badge>
                        <Badge variant="outline" className="text-zinc-400">{t.provider}</Badge>
                        <Badge variant="outline" className="text-zinc-500">{t.mode}</Badge>
                        <span className="font-medium text-zinc-200">{t.taskTitle}</span>
                        <span className="text-zinc-500">· {Math.round(t.precision * 100)}% · {new Date(t.at).toLocaleTimeString()}</span>
                      </div>
                      <div className="mt-1.5 text-xs text-zinc-400"><b className="text-zinc-300">It means:</b> {t.interpretation}</div>
                      <div className="mt-0.5 text-xs text-sky-400"><b>Next action:</b> {t.action}</div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-600 group-open:hidden"><ChevronDown className="h-3 w-3" /> show raw answer + envelope</div>
                    </summary>
                    <Separator className="my-2 bg-zinc-800" />
                    <div className="text-[11px] text-zinc-500">WHY: {t.promptTitle}</div>
                    <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950 p-2 text-[10px] leading-relaxed text-zinc-400">{t.raw}</pre>
                    <details className="mt-1"><summary className="cursor-pointer text-[10px] text-zinc-600">envelope sent</summary>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950 p-2 text-[10px] text-zinc-500">{t.envelope}</pre>
                    </details>
                  </details>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= BLUEPRINTS ================= */}
          <TabsContent value="blueprints" className="space-y-6">
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader><CardTitle className="text-lg">One site · five devices · five different relative layouts</CardTitle>
                <p className="text-sm text-zinc-400">Two blueprint layers stack together: the 12-pattern layout book (page geometry, below) × the five device classes (structural law, beneath it). These are not zoom levels — each device class re-arranges nav pattern, hero composition, column counts, footer anatomy and type scale. Built from relative units only: %, fr, clamp(), rem, aspect-ratio.</p>
              </CardHeader>
            </Card>
            {/* LAYOUT BOOK */}
            <div>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Layer 1 · The layout book — 12 fully specified page layouts</h2>
                  <p className="text-sm text-zinc-400">Exact geometry + citable research source for every pattern. The wireframe stage picks one per seed; the device classes then reshape it.</p>
                </div>
                <Mono>{LAYOUTS.length} patterns</Mono>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {LAYOUTS.map((l) => (
                  <Card key={l.id} className="border-zinc-800 bg-zinc-900/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{l.name}</CardTitle>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="border-lime-300/40 font-mono text-lime-300">{l.readingPattern}-reading</Badge>
                        <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-300">hero: {l.heroMode}</Badge>
                        <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-300">nav: {l.navMode}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-[13px]">
                      <p className="text-zinc-300">{l.arrangement}</p>
                      <p className="font-mono text-[11px] text-lime-300/90">{specSummary(l)}</p>
                      <p className="text-zinc-500"><b className="text-zinc-400">Source:</b> {l.source}</p>
                      <p className="text-zinc-500"><b className="text-zinc-400">Mobile:</b> {l.mobile}</p>
                      <div className="flex flex-wrap gap-1">
                        {l.sectionOrder.map((s, i) => <Badge key={i} variant="outline" className="border-zinc-800 text-[10px] text-zinc-500">{i + 1}·{s}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            {/* DEVICE LAW */}
            <div>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Layer 2 · The device law — D1–D5 structural classes</h2>
                  <p className="text-sm text-zinc-400">The same site, five devices, five different relative layouts — nav, hero, grids, footer and type scale all re-arrange per class.</p>
                </div>
                <Mono>{devices.length} classes</Mono>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {devices.map((d, i) => (
                <Card key={d.id} className="border-zinc-800 bg-zinc-900/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{d.icon} {d.name}</CardTitle>
                      <Badge variant="outline" className="border-lime-300/40 font-mono text-lime-300">{d.id}</Badge>
                    </div>
                    <Mono>{d.range} · preview {d.previewWidth}px</Mono>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Wire d={d} />
                    <dl className="space-y-1.5 text-[13px]">
                      <div><dt className="inline font-mono text-[10px] uppercase tracking-widest text-lime-300">nav </dt><dd className="inline text-zinc-300">{d.nav}</dd></div>
                      <div><dt className="inline font-mono text-[10px] uppercase tracking-widest text-lime-300">hero </dt><dd className="inline text-zinc-300">{d.hero}</dd></div>
                      <div><dt className="inline font-mono text-[10px] uppercase tracking-widest text-lime-300">grid </dt><dd className="inline text-zinc-300">{d.featureCols}-col features · {d.galleryCols}-col gallery</dd></div>
                      <div><dt className="inline font-mono text-[10px] uppercase tracking-widest text-lime-300">footer </dt><dd className="inline text-zinc-300">{d.footer}</dd></div>
                      <div><dt className="inline font-mono text-[10px] uppercase tracking-widest text-lime-300">container </dt><dd className="inline text-zinc-300">{d.container} · gutters {d.gutter}</dd></div>
                      <div><dt className="inline font-mono text-[10px] uppercase tracking-widest text-lime-300">type </dt><dd className="inline text-zinc-300">{d.typeNote}</dd></div>
                      <div><dt className="inline font-mono text-[10px] uppercase tracking-widest text-lime-300">cta </dt><dd className="inline text-zinc-300">{d.cta}</dd></div>
                    </dl>
                    <div className="flex flex-wrap gap-1">{d.extras.map((x) => <Badge key={x} variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">{x}</Badge>)}</div>
                    <div className="pt-1 text-right"><Mono>{['base ≤ 640px', 'min-width: 641px', 'min-width: 1025px', 'min-width: 1441px', 'min-width: 1921px'][i]}</Mono></div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          </TabsContent>

          {/* ================= KNOWLEDGE ================= */}
          <TabsContent value="knowledge" className="grid gap-4 lg:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900/60 lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><InfinityIcon className="h-5 w-5 text-lime-300" /> Infinite possible sites — the combinatorics</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm text-zinc-300 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><div className="text-2xl font-black text-lime-300">~10<sup>{infty.exp}</sup></div><p className="mt-1 text-zinc-400">unique sites — about {infty.mantissa.toFixed(1)}×10<sup>{infty.exp}</sup> years of daily output. No lifetime repeats.</p></div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><Mono>palette</Mono><p className="mt-1">6 harmony formulas × 360 hues × 3 themes × continuous lightness curves, WCAG-corrected per role.</p></div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><Mono>structure</Mono><p className="mt-1">6 hero × 4 nav × 7 motifs × radius/button/rhythm/eyebrow/case × 6,720 section orders × 99 font pairs × 12 niches × naming grammar × ~30 billion copy picks.</p></div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-lime-300" /> The 12-book education — distilled, cover to cover</CardTitle>
                <p className="text-sm text-zinc-400">The canon the beast was raised on. Doctrine in its own words; every book contributes machine rules that the generator consults at the matching stage and cites in the work log.</p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {LIBRARY.map((b) => (
                  <div key={b.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="font-semibold leading-tight text-zinc-100">{b.title}</div>
                    <Mono>{b.author} · {b.year}</Mono>
                    <ul className="mt-2 space-y-1">
                      {b.doctrine.slice(0, 2).map((d, i) => <li key={i} className="text-[12.5px] leading-snug text-zinc-400">· {d}</li>)}
                    </ul>
                    <p className="mt-2 font-mono text-[10px] text-lime-300/80">{b.rules.length} machine rules → {b.powers}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-lime-300" /> The CRAP test — enforced in code</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-300">
                <p><b className="text-lime-300">C — Contrast.</b> Every palette is generated then corrected until ink/bg ≥ 7:1, soft ink ≥ 4.5:1, accent ≥ 3:1, text-on-accent ≥ 4.5:1 (WCAG).</p>
                <p><b className="text-lime-300">R — Repetition.</b> One spacing scale, one type scale, tokenised colour roles — repeated across every section and every site.</p>
                <p><b className="text-lime-300">A — Alignment.</b> Everything sits on one container grid per device class; nothing is nudged by eye.</p>
                <p><b className="text-lime-300">P — Proximity.</b> Related blocks are grouped; section rhythm is a fixed multiple of the spacing scale.</p>
                <p className="text-zinc-500">QA stage runs this audit per site before it may be stamped ©.</p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><PaletteIcon className="h-5 w-5 text-lime-300" /> Colour, interface & themes — the curriculum</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-300">
                <p><b>Deliberate order:</b> brief → palette → wireframe → build → polish → QA → stamp. Every task passes its gates before the output freezes — nothing ships unfinished.</p>
                <p><b>Colour:</b> harmony math (analogous / complementary / triadic / split / tetradic / monochrome), hue families named, then contrast-corrected — never sampled by “vibe”.</p>
                <p><b>Interface:</b> 4/8px spacing scale, ≥44px touch targets, focus-visible rings, fluid type with clamp(), semantic landmarks (header/main/section/footer).</p>
                <p><b>Themes:</b> light / dark / duotone are token sets, not colour swaps — every token re-derives per theme with its own contrast pass.</p>
                <p><b>Layouts:</b> the five-class blueprint on the Blueprints tab is the law; the renderer may vary structure within it, never violate it.</p>
                <p className="text-zinc-500">Syllabus areas distilled from the web-design canon (typography, grid systems, visual hierarchy, UX fundamentals, responsive patterns) — applied as rules, not excerpts.</p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Keyboard className="h-5 w-5 text-lime-300" /> Lessons absorbed from the scraped repo</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-300">
                <p className="flex items-center gap-2"><Github className="h-4 w-4" /> <span className="font-mono text-[13px]">abbylukwa/whatsapp-qr-app</span></p>
                <p><b>Key-pool pattern:</b> numbered slots (API_1…API_8) with provider auto-detection by key shape → became the beast’s studio slots: parallel jobs, no blocking.</p>
                <p><b>Keys as resource objects:</b> registry with scope/priority/cost → became site records: seed, stage, price, provenance.</p>
                <p><b>Cool-and-revive:</b> failed tasks cool down instead of blocking the queue → a stuck build never stalls the whole studio.</p>
                <p className="text-zinc-500">Security note: real key values were never copied — structure and patterns only. Full notes: <span className="font-mono text-[12px] text-lime-300/80">download/beast-research/api-key-notes.md</span></p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Layers className="h-5 w-5 text-lime-300" /> Business loop</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-300">
                <p>1. The beast builds up to 3 sites in parallel and drains the ledger until nothing is pending — every task real, every task logged.</p>
                <p>2. Finished sites land on the shelf with your © + year baked into every page and licence file.</p>
                <p>3. You preview on all five device classes, download the ZIP, sell it.</p>
                <p>4. Clear the workspace; a new cycle starts and the beast immediately commissions fresh work. The queue never empties.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= TEST CENTER ================= */}
          <TabsContent value="tests" className="space-y-6">
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg"><FlaskConical className="h-5 w-5 text-lime-300" /> Feature-by-feature verification</CardTitle>
                  <p className="mt-1 text-sm text-zinc-400">
                    The whole beast, tested: generator determinism, the D1–D5 structural breakpoint law, WCAG contrast (light <em>and</em> dark),
                    © injection, uniqueness, motifs, accessibility, the layout book, and the truthful work engine — run against a throwaway sandbox,
                    never touching the live studio. The same suite ships as <span className="font-mono text-[12px] text-lime-300/80">scripts/test-beast.ts</span>.
                  </p>
                </div>
                <Button size="sm" className="shrink-0 bg-lime-300 font-bold text-zinc-950 hover:bg-lime-200" disabled={testing} onClick={runTests}>
                  <FlaskConical className="h-4 w-4" /> {testing ? 'Testing…' : 'Run all feature tests'}
                </Button>
              </CardHeader>
              {testReport && (
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div className={`rounded-lg border p-3 ${testReport.failCount === 0 ? 'border-lime-300/40 bg-lime-300/5' : 'border-red-500/40 bg-red-500/5'}`}>
                    <div className={`text-3xl font-black ${testReport.failCount === 0 ? 'text-lime-300' : 'text-red-400'}`}>
                      {testReport.passCount}/{testReport.results.length}
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">{testReport.failCount === 0 ? 'every feature verified' : `${testReport.failCount} features failing`} · {testReport.durationMs}ms</p>
                  </div>
                  {['A · Generator', 'B · Design knowledge', 'C · Engine (sandboxed)'].map((g) => {
                    const rs = testReport.results.filter((r) => r.group === g);
                    const p = rs.filter((r) => r.pass).length;
                    return (
                      <div key={g} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <Mono>{g}</Mono>
                        <div className="mt-1 text-xl font-bold text-zinc-100">{p}/{rs.length} <span className="text-sm font-normal text-zinc-500">pass</span></div>
                        <div className="mt-2 flex gap-1">{rs.map((r) => <span key={r.id} title={r.feature} className={`h-1.5 flex-1 rounded-full ${r.pass ? 'bg-lime-300' : 'bg-red-500'}`} />)}</div>
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>

            {testReport && (
              <div className="space-y-3">
                {['A · Generator', 'B · Design knowledge', 'C · Engine (sandboxed)'].map((g) => (
                  <Card key={g} className="border-zinc-800 bg-zinc-900/60">
                    <CardHeader className="pb-2"><CardTitle className="text-base">{g}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {testReport.results.filter((r) => r.group === g).map((r) => (
                        <div key={r.id} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2.5">
                          <Badge className={`mt-0.5 shrink-0 font-mono text-[10px] ${r.pass ? 'bg-lime-300 text-zinc-950' : 'bg-red-500 text-white'}`}>{r.pass ? 'PASS' : 'FAIL'}</Badge>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-zinc-200"><span className="mr-2 font-mono text-[11px] text-zinc-500">{r.id}</span>{r.feature}</div>
                            <div className="mt-0.5 text-[12px] leading-snug text-zinc-500">{r.detail}</div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ================= PREVIEW DIALOG ================= */}
      <Dialog open={!!previewSite} onOpenChange={(o) => !o && setPreviewSite(null)}>
        <DialogContent className="max-h-[94vh] overflow-y-auto border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {previewSite?.brand}
              <Badge variant="outline" className="border-lime-300/40 font-mono text-lime-300">{dev?.icon} {dev?.name} · {dev?.id}</Badge>
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Same site, five devices — watch the layout re-arrange, not just shrink.
            </DialogDescription>
          </DialogHeader>
          {previewSite && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {devices.map((d, i) => (
                  <Button
                    key={d.id}
                    size="sm"
                    variant={i === deviceIdx ? 'default' : 'outline'}
                    className={i === deviceIdx ? 'bg-lime-300 font-bold text-zinc-950 hover:bg-lime-200' : 'border-zinc-700 hover:bg-zinc-800'}
                    onClick={() => setDeviceIdx(i)}
                  >
                    {d.icon} <span className="ml-1">{d.name}</span> <span className="ml-1 font-mono text-[10px] opacity-70">{d.previewWidth}px</span>
                  </Button>
                ))}
              </div>
              <DevicePreview siteId={previewSite.id} width={dev?.previewWidth ?? 1280} />
              {dev && (
                <div className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[13px] md:grid-cols-3">
                  <div><Mono>nav →</Mono> <span className="text-zinc-300">{dev.nav}</span></div>
                  <div><Mono>hero →</Mono> <span className="text-zinc-300">{dev.hero}</span></div>
                  <div><Mono>grid →</Mono> <span className="text-zinc-300">{dev.featureCols}-col · {dev.footer}</span></div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= FOOTER ================= */}
      <footer className="mt-auto border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Mono>beast.studio — real work, real logs, nothing simulated</Mono>
          <Mono>© {new Date().getFullYear()} {status?.owner ?? 'Beast Studio'} · all generated sites carry this stamp</Mono>
        </div>
      </footer>
    </div>
  );
}
