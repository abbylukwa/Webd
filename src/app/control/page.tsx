'use client';

// MISSION CONTROL — the huge panel: whole progress, difference, precisions,
// and every AI answer with its interpretation ("this answer means this, do this").
// Everything the studio does is visible here, and everything is controllable.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Activity, ArrowLeft, Braces, CheckCircle2, ChevronDown, Clock, Database, FileDiff, Gauge,
  Github, GitBranch, Pencil, Play, RefreshCw, Send, ShieldCheck, Sparkles, Trash2, XCircle, Zap,
} from 'lucide-react';

/* ---------- types (mirror of /api/beast) ---------- */
type Task = { id: string; kind: string; title: string; why: string; status: string; pageKey: string | null; device: string | null; detour: boolean; attempts: number; precision: number; note: string | null; rules: number; acceptedAt: string | null };
type Site = {
  id: string; brand: string; nicheLabel: string; city: string; stageIndex: number; status: string; price: number; startedAt: string;
  design: { heroVariant: string; navVariant: string; motif: string; fontHead: string; fontBody: string; spaceRhythm: string; sectionCount: number };
  palette: { name: string; harmony: string; theme: string; swatches: string[] };
  qa: { contrast: { pair: string; ratio: number; pass: boolean }[]; breakpoints: string[]; crap: string[] } | null;
  copyright: string; log: { at: string; entry: string }[];
  tasks: Task[]; pages: { key: string; title: string; purpose: string; file: string; inNav: boolean }[];
  brief: { audience: string; tone: string; promise: string; cityStory?: string } | null;
  revisions: Record<string, { v: number; lines: number; diff: number; at: string }[]> | null;
  git: { repo: string; url: string; pushedAt: string } | null;
  valuesSummary: { phones: number; products: number; socials: number } | null;
  images: { slotId: string; status: string; source: string; license: string | null }[];
  progress: number;
  taskCounts: { total: number; accepted: number; queued: number; deferred: number };
};
type Turn = { id: string; taskId: string; taskTitle: string; provider: string; mode: string; promptTitle: string; envelope: string; raw: string; interpretation: string; verdict: string; action: string; precision: number; at: string };
type LogEvent = { at: string; siteId?: string; taskTitle?: string; message: string; level: 'info' | 'done' | 'warn' | 'error' };
type State = {
  version: number; cycle: number; startedAt: string; working: boolean; owner: string; concurrency: number;
  stages: { key: string; label: string; desc: string }[];
  devices: { id: string; name: string; range: string }[];
  layoutCount: number; github: { configured: boolean }; ai: { enabled: boolean };
  sites: Site[]; transcript: Turn[]; log: LogEvent[];
};

const STATUS_STYLE: Record<string, string> = {
  'in-studio': 'bg-amber-950 text-amber-300 border-amber-800',
  'for-sale': 'bg-emerald-950 text-emerald-300 border-emerald-800',
  'sold': 'bg-zinc-800 text-zinc-300 border-zinc-600',
};
const VERDICT_STYLE: Record<string, 'default' | 'secondary' | 'destructive'> = { ACCEPT: 'default', REFINE: 'secondary', DEFER: 'destructive' };

const CODEBOOK = [
  { pattern: 'Answer parses as JSON and satisfies the contract (length, banned words, required fields)', means: 'The AI did its job — the output is trustworthy for this task.', action: 'ACCEPT → frozen into the site artifacts, task marked accepted with precision 1.0.', icon: 'accept' },
  { pattern: 'Answer is not parseable JSON (prose, preamble, markdown chatter)', means: 'The contract was ignored — the answer is unusable as-is.', action: 'REFINE → re-queued with the critique attached (attempt n/3). After 3 failures → deterministic solver finishes the task.', icon: 'refine' },
  { pattern: 'Answer violates a rule (banned marketing word, heading > 60 chars, body outside 25–70 words)', means: 'Style-governance breach — quality floor enforced.', action: 'REFINE with the exact violated rule as the critique so the next attempt fixes it.', icon: 'refine' },
  { pattern: 'AI pool empty, keys unhealthy, or provider timeout', means: 'No AI is available right now — the studio never waits.', action: 'DEFER → deterministic solver produces the artifact immediately. Zero downtime, precision noted honestly.', icon: 'defer' },
  { pattern: 'GitHub publish attempted with no BEAST_GH_TOKEN configured', means: 'The archive vault is not connected yet.', action: 'DEFER → task parked (Publish button retries it). Add the token in the Render dashboard Environment to enable.', icon: 'defer' },
  { pattern: 'Image sources return nothing usable (Openverse → Wikimedia miss)', means: 'No openly-licensed match found for that slot.', action: 'Fall back Picsum → gradient floor; slot stays attributed; determinism record frozen so it is never re-fetched.', icon: 'defer' },
];

export default function ControlPage() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<string>('');
  const [ownerDraft, setOwnerDraft] = useState('');
  const [editorSite, setEditorSite] = useState<string>('');
  const [values, setValues] = useState<Record<string, unknown> | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/beast', { cache: 'no-store' });
      const json = (await res.json()) as State;
      setState(json);
      setOwnerDraft((d) => d || json.owner);
    } catch { /* the studio keeps running even if a poll fails */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const act = useCallback(async (body: Record<string, unknown>, label: string) => {
    setBusy(label);
    try {
      const res = await fetch('/api/beast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setState(json as State);
      toast({ title: label, description: Array.isArray(json.jobs) ? json.jobs.slice(0, 2).join(' · ') : 'Done.' });
    } catch (e) {
      toast({ title: `${label} failed`, description: String((e as Error).message), variant: 'destructive' });
    } finally { setBusy(''); }
  }, [toast]);

  const openEditor = async (siteId: string) => {
    setEditorSite(siteId);
    setValues(null);
    try {
      const res = await fetch('/api/beast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getValues', siteId }) });
      const json = await res.json();
      setValues(json.values ?? {});
    } catch { toast({ title: 'Could not load values', variant: 'destructive' }); }
  };

  const saveValues = async () => {
    if (!editorSite || !values) return;
    setBusy('Save values');
    try {
      const res = await fetch('/api/beast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'setValues', siteId: editorSite, values }) });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error((json.issues ?? ['invalid values']).join('; '));
      setState(json as State);
      toast({ title: 'Values saved', description: 'Every built page re-rendered with the new facts.' });
    } catch (e) {
      toast({ title: 'Save rejected', description: String((e as Error).message), variant: 'destructive' });
    } finally { setBusy(''); }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400"><RefreshCw className="h-5 w-5 animate-spin" /> Waking the Beast…</div>
      </div>
    );
  }

  const inStudio = state.sites.filter((s) => s.status === 'in-studio');
  const forSale = state.sites.filter((s) => s.status === 'for-sale');
  const allTasks = state.sites.flatMap((s) => s.tasks);
  const avgProgress = state.sites.length ? Math.round(state.sites.reduce((a, s) => a + s.progress, 0) / state.sites.length) : 0;
  const verdicts = state.transcript.reduce<Record<string, number>>((m, t) => { m[t.verdict] = (m[t.verdict] ?? 0) + 1; return m; }, {});
  const aiTurns = state.transcript.filter((t) => t.mode === 'ai').length;
  const accepted = allTasks.filter((t) => t.status === 'accepted');
  const avgPrecision = accepted.length ? accepted.reduce((a, t) => a + t.precision, 0) / accepted.length : 0;
  const qaPairs = state.sites.flatMap((s) => s.qa?.contrast ?? []);
  const qaPass = qaPairs.length ? Math.round((qaPairs.filter((p) => p.pass).length / qaPairs.length) * 100) : null;

  const v = (values ?? {}) as {
    brand?: string; tagline?: string; domain?: string; address?: string; hoursDisplay?: string[]; emails?: string[];
    phones?: { label: string; number: string }[]; socials?: { platform: string; handle: string; url: string }[];
    products?: { name: string; desc: string; price: number; tag?: string }[];
  };

  const socialUrlFor = (platform: string, handle: string): string => {
    const h = handle.replace(/^@/, '');
    if (platform === 'whatsapp') return `https://wa.me/${h.replace(/[^\d]/g, '')}`;
    if (platform === 'x') return `https://x.com/${h}`;
    if (platform === 'linkedin') return `https://linkedin.com/company/${h}`;
    if (platform === 'youtube') return `https://youtube.com/@${h}`;
    if (platform === 'tiktok') return `https://tiktok.com/@${h}`;
    return `https://${platform}.com/${h}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/60 sticky top-0 z-40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/"><Button variant="ghost" size="sm" className="text-zinc-400"><ArrowLeft className="h-4 w-4 mr-1" /> Studio</Button></Link>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-amber-400" />
            <h1 className="font-semibold tracking-tight">Mission Control</h1>
            <Badge variant="outline" className="text-zinc-400">v{state.version}</Badge>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
            <Badge variant="outline" className={state.working ? 'gap-1 border-amber-800 text-amber-300' : 'gap-1'}><Activity className="h-3 w-3" /> {state.working ? 'WORKING…' : 'IDLE'}</Badge>
            <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> cycle {state.cycle}</Badge>
            <Badge variant="outline" className="gap-1"><Database className="h-3 w-3" /> GitHub {state.github.configured ? 'connected' : 'not connected'}</Badge>
            <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> AI {state.ai.enabled ? 'enabled' : 'solver floor'}</Badge>
            <Badge variant="outline" className="gap-1"><Braces className="h-3 w-3" /> {state.layoutCount} layouts</Badge>
            <Button variant="ghost" size="sm" onClick={refresh} className="text-zinc-400"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* top stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Overall progress', value: `${avgProgress}%` },
            { label: 'In studio', value: inStudio.length },
            { label: 'On the shelf', value: forSale.length },
            { label: 'Micro-tasks done', value: accepted.length },
            { label: 'Avg precision', value: avgPrecision ? `${Math.round(avgPrecision * 100)}%` : '—' },
            { label: 'QA contrast', value: qaPass === null ? '—' : `${qaPass}%` },
          ].map((s) => (
            <Card key={s.label} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-xs text-zinc-500">{s.label}</div>
                <div className="text-2xl font-semibold mt-1">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="progress">
          <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto">
            <TabsTrigger value="progress" className="gap-1"><Activity className="h-3.5 w-3.5" /> Progress</TabsTrigger>
            <TabsTrigger value="difference" className="gap-1"><FileDiff className="h-3.5 w-3.5" /> Difference</TabsTrigger>
            <TabsTrigger value="precision" className="gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Precisions</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1"><Sparkles className="h-3.5 w-3.5" /> AI answers <Badge variant="secondary" className="ml-1">{state.transcript.length}</Badge></TabsTrigger>
            <TabsTrigger value="controls" className="gap-1"><Zap className="h-3.5 w-3.5" /> Controls</TabsTrigger>
          </TabsList>

          {/* ─────────────── PROGRESS ─────────────── */}
          <TabsContent value="progress" className="space-y-4">
            {state.sites.length === 0 && (
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-8 text-center text-zinc-400">
                The studio floor is empty — every site is earned task by task. Press <b>Work now</b> in Controls to start the drain immediately.
              </CardContent></Card>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {state.sites.map((s) => (
                <Card key={s.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{s.brand}</CardTitle>
                      <Badge variant="outline" className={STATUS_STYLE[s.status]}>{s.status}</Badge>
                      <Badge variant="outline" className="text-zinc-400">{state.stages[Math.min(s.stageIndex, 6)]?.label ?? 'Stage 0'}</Badge>
                      {s.price > 0 && <Badge variant="outline" className="text-emerald-300">${s.price}</Badge>}
                    </div>
                    <div className="text-xs text-zinc-500">{s.nicheLabel} in {s.city} · seed {s.id.slice(-6)} · palette “{s.palette.name}” ({s.palette.harmony})</div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Ledger</span><span>{s.progress}% · {s.taskCounts.accepted}/{s.taskCounts.total} accepted{s.taskCounts.deferred ? ` · ${s.taskCounts.deferred} deferred` : ''}</span></div>
                      <Progress value={s.progress} className="h-2" />
                    </div>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {s.pages.map((p) => (
                        <Badge key={p.key} variant="secondary" className="bg-zinc-800 text-zinc-300">{p.file}</Badge>
                      ))}
                      {s.valuesSummary && (
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">{s.valuesSummary.phones} phones · {s.valuesSummary.products} products · {s.valuesSummary.socials} socials</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 text-[11px] text-zinc-500">
                      {s.images.slice(0, 8).map((im) => (
                        <span key={im.slotId} className={`px-1.5 py-0.5 rounded border ${im.status === 'live' ? 'border-emerald-800 text-emerald-400' : im.status === 'picsum' ? 'border-sky-800 text-sky-400' : 'border-zinc-700'}`}>{im.slotId}: {im.status}</span>
                      ))}
                    </div>
                    {s.git && (
                      <a href={s.git.url} target="_blank" rel="noopener" className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1"><GitBranch className="h-3 w-3" /> {s.git.repo}</a>
                    )}
                    <Separator className="bg-zinc-800" />
                    <ScrollArea className="h-28">
                      <ul className="space-y-1 text-xs text-zinc-400 pr-2">
                        {s.tasks.filter((t) => t.status === 'accepted').slice(-4).map((t) => (
                          <li key={t.id} className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span><b className="text-zinc-300">{t.title}</b> — {t.note ?? 'accepted'}</span></li>
                        ))}
                        {s.tasks.filter((t) => t.status === 'queued').slice(0, 3).map((t) => (
                          <li key={t.id} className="flex gap-2 text-zinc-500"><Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>next: {t.title}</span></li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─────────────── DIFFERENCE ─────────────── */}
          <TabsContent value="difference" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileDiff className="h-4 w-4 text-sky-400" /> The actual log — every execution, real timestamps</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <ul className="space-y-1.5 pr-2">
                      {state.log.slice(0, 120).map((ev, i) => (
                        <li key={i} className="border-l-2 border-zinc-700 pl-3 leading-snug">
                          <span className="font-mono text-[10px] text-zinc-500">{new Date(ev.at).toLocaleString()}</span>
                          {ev.taskTitle && <span className="ml-2 font-mono text-[10px] text-zinc-600">{ev.taskTitle}</span>}
                          <div className={`text-xs ${ev.level === 'done' ? 'text-lime-300' : ev.level === 'warn' ? 'text-amber-300' : ev.level === 'error' ? 'text-red-400' : 'text-zinc-300'}`}>{ev.message}</div>
                        </li>
                      ))}
                      {state.log.length === 0 && <li className="text-xs text-zinc-500">The log is empty — it fills as the beast executes.</li>}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileDiff className="h-4 w-4 text-sky-400" /> Page revisions — the polish diff</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {state.sites.map((s) => {
                    const revs = Object.entries(s.revisions ?? {});
                    if (!revs.length) return null;
                    return (
                      <div key={s.id}>
                        <div className="text-xs font-medium text-zinc-300 mb-1">{s.brand}</div>
                        {revs.map(([page, list]) => (
                          <div key={page} className="text-xs text-zinc-400 flex gap-2 items-center flex-wrap">
                            <span className="w-28 shrink-0 truncate text-zinc-500">{page}</span>
                            {list.map((r) => (
                              <Badge key={r.v} variant="outline" className="text-[10px] text-zinc-400">rev{r.v} · {r.lines} lines {r.diff ? `· Δ${r.diff}` : ''}</Badge>
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {!state.sites.some((s) => Object.keys(s.revisions ?? {}).length) && (
                    <p className="text-xs text-zinc-500">No revisions yet — they appear after pages are built and reviewed.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─────────────── PRECISIONS ─────────────── */}
          <TabsContent value="precision" className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3">
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4">
                <div className="text-xs text-zinc-500">AI verdicts (recent turns)</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge>{verdicts.ACCEPT ?? 0} accept</Badge>
                  <Badge variant="secondary">{verdicts.REFINE ?? 0} refine</Badge>
                  <Badge variant="destructive">{verdicts.DEFER ?? 0} defer</Badge>
                </div>
                <div className="text-[11px] text-zinc-500 mt-2">{aiTurns} of {state.transcript.length} turns came from live AI; the rest from the deterministic floor.</div>
              </CardContent></Card>
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4">
                <div className="text-xs text-zinc-500">Average task precision</div>
                <div className="text-2xl font-semibold mt-1">{Math.round(avgPrecision * 100)}%</div>
                <Progress value={avgPrecision * 100} className="h-1.5 mt-2" />
              </CardContent></Card>
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4">
                <div className="text-xs text-zinc-500">QA contrast pairs passing</div>
                <div className="text-2xl font-semibold mt-1">{qaPass === null ? '—' : `${qaPass}%`}</div>
                <div className="text-[11px] text-zinc-500 mt-2">{qaPairs.length} pairs measured across shelf sites.</div>
              </CardContent></Card>
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4">
                <div className="text-xs text-zinc-500">Governance gates</div>
                <div className="text-2xl font-semibold mt-1">{allTasks.filter((t) => t.status === 'accepted' && t.rules >= 3).length}/{allTasks.length}</div>
                <div className="text-[11px] text-zinc-500 mt-2">tasks carry the full envelope (rules + knowledge + why).</div>
              </CardContent></Card>
            </div>
            {state.sites.map((s) => {
              const acc = s.tasks.filter((t) => t.status === 'accepted');
              const avg = acc.length ? Math.round((acc.reduce((a, t) => a + t.precision, 0) / acc.length) * 100) : 0;
              return (
                <Card key={s.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{s.brand} — per-task precision <Badge variant="outline" className="ml-2">{avg}% avg</Badge></CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {s.tasks.map((t) => (
                      <span key={t.id} title={`${t.title} — ${t.status} · why: ${t.why}`}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${t.status === 'accepted' ? (t.precision >= 0.9 ? 'border-emerald-800 text-emerald-400' : 'border-amber-800 text-amber-400') : t.status === 'deferred' ? 'border-red-800 text-red-400' : 'border-zinc-700 text-zinc-500'}`}>
                        {t.kind}{t.status === 'accepted' ? ` ${Math.round(t.precision * 100)}%` : ''}
                      </span>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ─────────────── AI ANSWERS ─────────────── */}
          <TabsContent value="ai" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Braces className="h-4 w-4 text-amber-400" /> The codebook — what each kind of answer means and what happens next</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                {CODEBOOK.map((c, i) => (
                  <div key={i} className="rounded-lg border border-zinc-800 p-3 text-xs space-y-1">
                    <div className="flex items-start gap-2">
                      {c.icon === 'accept' ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : c.icon === 'refine' ? <XCircle className="h-4 w-4 text-amber-500 shrink-0" /> : <Clock className="h-4 w-4 text-red-400 shrink-0" />}
                      <div>
                        <div className="text-zinc-200 font-medium">If the answer: {c.pattern}</div>
                        <div className="text-zinc-400 mt-0.5">It means: {c.means}</div>
                        <div className="text-sky-400 mt-0.5">Then: {c.action}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2"><CardTitle className="text-base">Every answer, interpreted — newest first</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {state.transcript.length === 0 && <p className="text-xs text-zinc-500">No turns yet — the first executions land here as they happen.</p>}
                {state.transcript.slice(0, 40).map((t) => (
                  <details key={t.id} className="rounded-lg border border-zinc-800 p-3 group">
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <Badge variant={VERDICT_STYLE[t.verdict] ?? 'secondary'}>{t.verdict}</Badge>
                        <Badge variant="outline" className="text-zinc-400">{t.provider}</Badge>
                        <Badge variant="outline" className="text-zinc-500">{t.mode}</Badge>
                        <span className="text-zinc-200 font-medium">{t.taskTitle}</span>
                        <span className="text-zinc-500">· {Math.round(t.precision * 100)}% · {new Date(t.at).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1.5"><b className="text-zinc-300">Understood:</b> {t.interpretation}</div>
                      <div className="text-xs text-sky-400 mt-0.5"><b>Did:</b> {t.action}</div>
                      <div className="text-[11px] text-zinc-600 mt-1 flex items-center gap-1 group-open:hidden"><ChevronDown className="h-3 w-3" /> show raw answer + envelope</div>
                    </summary>
                    <Separator className="bg-zinc-800 my-2" />
                    <div className="text-[11px] text-zinc-500">WHY: {t.promptTitle}</div>
                    <pre className="text-[10px] leading-relaxed text-zinc-400 bg-zinc-950 border border-zinc-800 rounded p-2 mt-1 whitespace-pre-wrap max-h-40 overflow-auto">{t.raw}</pre>
                    <details className="mt-1"><summary className="text-[10px] text-zinc-600 cursor-pointer">envelope sent</summary>
                      <pre className="text-[10px] text-zinc-500 bg-zinc-950 border border-zinc-800 rounded p-2 mt-1 whitespace-pre-wrap max-h-40 overflow-auto">{t.envelope}</pre>
                    </details>
                  </details>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─────────────── CONTROLS ─────────────── */}
          <TabsContent value="controls" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-base">Studio controls</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <Input value={ownerDraft} onChange={(e) => setOwnerDraft(e.target.value)} placeholder="Owner name (the © holder)" className="bg-zinc-950 border-zinc-800" />
                    <Button size="sm" disabled={busy !== '' || !ownerDraft.trim()} onClick={() => act({ action: 'setOwner', owner: ownerDraft }, 'Owner renamed')}>Save</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy !== ''} onClick={() => act({ action: 'work' }, 'Ledger drained')}><Play className="h-3.5 w-3.5 mr-1" /> Work now — drain all pending tasks</Button>
                    <Button size="sm" variant="outline" disabled={busy !== ''} onClick={() => act({ action: 'commission' }, 'New site commissioned')}><Zap className="h-3.5 w-3.5 mr-1" /> Commission a site</Button>
                    <Button size="sm" variant="outline" disabled={busy !== '' || !state.github.configured || forSale.length === 0} onClick={() => act({ action: 'pushGithub', siteId: 'all' }, 'Pushed to GitHub vaults')}><Github className="h-3.5 w-3.5 mr-1" /> Push all shelf sites to GitHub</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={busy !== ''}><Trash2 className="h-3.5 w-3.5 mr-1" /> Clear workspace</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear the whole studio?</AlertDialogTitle>
                          <AlertDialogDescription className="text-zinc-400">
                            Every site and its files are deleted. The ledger restarts empty. GitHub archives already pushed stay online.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-zinc-800 border-zinc-700">Keep everything</AlertDialogCancel>
                          <AlertDialogAction onClick={() => act({ action: 'clear' }, 'Workspace cleared')}>Clear it</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  {!state.github.configured && (
                    <p className="text-[11px] text-zinc-500 border border-zinc-800 rounded p-2">
                      <b>GitHub vault:</b> add <code>BEAST_GH_TOKEN</code> in the Render dashboard (Environment), then shelf sites publish to their own auto-named repo <code>beast-site-&lt;slug&gt;-&lt;seed6&gt;</code> in one commit.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-base">Per-site controls</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {state.sites.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 flex-wrap text-xs border border-zinc-800 rounded p-2">
                      <span className="font-medium text-zinc-200">{s.brand}</span>
                      <Badge variant="outline" className={STATUS_STYLE[s.status]}>{s.status}</Badge>
                      <div className="ml-auto flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline" disabled={busy !== '' || s.status !== 'in-studio'} onClick={() => act({ action: 'runTask', siteId: s.id }, `${s.brand}: task run`)}><Zap className="h-3 w-3 mr-1" /> Run next task</Button>
                        <Button size="sm" variant="outline" disabled={busy !== '' || s.status !== 'for-sale'} onClick={() => act({ action: 'pushGithub', siteId: s.id }, `${s.brand}: publish`)}><Github className="h-3 w-3 mr-1" /> Publish</Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => openEditor(s.id)}><Pencil className="h-3 w-3 mr-1" /> Values</Button>
                          </DialogTrigger>
                          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl max-h-[85vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Edit values — {s.brand}</DialogTitle>
                            </DialogHeader>
                            {!values ? <p className="text-sm text-zinc-400 py-6">Loading values…</p> : (
                              <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="text-xs text-zinc-400">Brand<input className="mt-1 bg-zinc-950 border-zinc-800" value={v.brand ?? ''} onChange={(e) => setValues({ ...values, brand: e.target.value })} /></label>
                                  <label className="text-xs text-zinc-400">Tagline<input className="mt-1 bg-zinc-950 border-zinc-800" value={v.tagline ?? ''} onChange={(e) => setValues({ ...values, tagline: e.target.value })} /></label>
                                  <label className="text-xs text-zinc-400">Domain<input className="mt-1 bg-zinc-950 border-zinc-800" value={v.domain ?? ''} onChange={(e) => setValues({ ...values, domain: e.target.value })} /></label>
                                  <label className="text-xs text-zinc-400">Address<input className="mt-1 bg-zinc-950 border-zinc-800" value={v.address ?? ''} onChange={(e) => setValues({ ...values, address: e.target.value })} /></label>
                                </div>
                                <label className="text-xs text-zinc-400 block">Emails (comma-separated)<input className="mt-1 bg-zinc-950 border-zinc-800 w-full" value={(v.emails ?? []).join(', ')} onChange={(e) => setValues({ ...values, emails: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></label>
                                <div>
                                  <div className="text-xs text-zinc-400 mb-1">Phone lines — max 12 ({(v.phones ?? []).length})</div>
                                  <div className="space-y-1">
                                    {(v.phones ?? []).map((p, i) => (
                                      <div key={i} className="flex gap-1">
                                        <Input className="bg-zinc-950 border-zinc-800 w-32" value={p.label} onChange={(e) => { const arr = [...(v.phones ?? [])]; arr[i] = { ...p, label: e.target.value }; setValues({ ...values, phones: arr }); }} />
                                        <Input className="bg-zinc-950 border-zinc-800 flex-1" value={p.number} onChange={(e) => { const arr = [...(v.phones ?? [])]; arr[i] = { ...p, number: e.target.value }; setValues({ ...values, phones: arr }); }} />
                                        <Button size="sm" variant="ghost" className="text-red-400 px-2" onClick={() => setValues({ ...values, phones: (v.phones ?? []).filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                                      </div>
                                    ))}
                                  </div>
                                  <Button size="sm" variant="outline" className="mt-1" disabled={(v.phones ?? []).length >= 12} onClick={() => setValues({ ...values, phones: [...(v.phones ?? []), { label: 'New line', number: '+1 555 000 0000' }] })}>Add line</Button>
                                </div>
                                <div>
                                  <div className="text-xs text-zinc-400 mb-1">Social handles — {(v.socials ?? []).length} platforms</div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {(v.socials ?? []).map((so, i) => (
                                      <div key={so.platform} className="flex items-center gap-1">
                                        <span className="text-[10px] w-16 text-zinc-500 shrink-0">{so.platform}</span>
                                        <Input className="bg-zinc-950 border-zinc-800 h-7 text-xs" value={so.handle} onChange={(e) => { const arr = [...(v.socials ?? [])]; arr[i] = { ...so, handle: e.target.value, url: socialUrlFor(so.platform, e.target.value) }; setValues({ ...values, socials: arr }); }} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-zinc-400 mb-1">Products — max 30 ({(v.products ?? []).length})</div>
                                  <ScrollArea className="h-40 border border-zinc-800 rounded p-2">
                                    <div className="space-y-1">
                                      {(v.products ?? []).map((p, i) => (
                                        <div key={i} className="flex gap-1 items-center">
                                          <Input className="bg-zinc-950 border-zinc-800 h-7 text-xs flex-1" value={p.name} onChange={(e) => { const arr = [...(v.products ?? [])]; arr[i] = { ...p, name: e.target.value }; setValues({ ...values, products: arr }); }} />
                                          <Input className="bg-zinc-950 border-zinc-800 h-7 text-xs w-20" type="number" step="0.01" value={p.price} onChange={(e) => { const arr = [...(v.products ?? [])]; arr[i] = { ...p, price: Number(e.target.value) }; setValues({ ...values, products: arr }); }} />
                                          <Button size="sm" variant="ghost" className="text-red-400 px-1.5" onClick={() => setValues({ ...values, products: (v.products ?? []).filter((_, j) => j !== i) })}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                  <Button size="sm" variant="outline" className="mt-1" disabled={(v.products ?? []).length >= 30} onClick={() => setValues({ ...values, products: [...(v.products ?? []), { name: 'New product', desc: 'Made to order.', price: 10 }] })}>Add product</Button>
                                </div>
                                <Button className="w-full" disabled={busy !== ''} onClick={saveValues}><Send className="h-3.5 w-3.5 mr-1" /> {busy === 'Save values' ? 'Saving + re-rendering…' : 'Save — re-render every page'}</Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <footer className="border-t border-zinc-800 py-4 text-center text-[11px] text-zinc-600">
        Beast Web Developer v{state.version} — Mission Control · everything visible, everything controllable.
      </footer>
    </div>
  );
}
