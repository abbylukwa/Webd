"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Hammer, Library, Settings2, Download, ExternalLink, Trash2, Sparkles,
  Clock, Eye, FlaskConical, KeyRound, Plus, X, Github, SunMoon,
} from "lucide-react";

// ─── Types (mirror of the server read model) ──────────────────────────
interface DelibLine { t: number; phase: string; text: string }
interface JobView {
  id: string; name: string; archetypeId: string; archetypeLabel: string;
  status: string; workbench: number | null; phaseIndex: number;
  phaseLabel: string; phaseVerb: string; phaseProgress: number; overallProgress: number;
  design: { paletteId: string; paletteName: string; pairingName: string; heroVariant: string; layoutId: string; layoutName: string; layoutSource: string; readingPattern: string; colors: { bg: string; surface: string; ink: string; accent: string } };
  deliberation: DelibLine[]; etaRealMinutes: number | null;
  commissionedAt: string; shippedAt: string | null;
  audit: { grade: string; contrast: { pass: boolean; detail: string } } | null;
  hasHtml: boolean; wordCount: number | null;
}
interface StudioState {
  settings: { copyrightHolder: string; copyrightNote: string; pace: number; workbenches: number; autoRespawn: boolean; vaultCount: number };
  active: JobView[]; shipped: JobView[];
  stats: { shipped: number; active: number; beastHours: number; daysRunning: number; sitesPerDay: number; totalPhases: number };
  schedule: { date: string; label: string; forecast: number }[];
  phases: { key: string; label: string; minutes: number }[];
}
interface VaultView { id: string; label: string; provider: string; masked: string; addedAt: string; lastStatus: string }
interface BookLesson { id: string; title: string; author: string; year: number; doctrine: string[]; rules: string[]; powers: string }
interface LayoutBook {
  id: string; name: string; source: string; readingPattern: string; arrangement: string;
  heroMode: string; sectionOrder: string[]; featuresMode: string; storyMode: string;
  voicesMode: string; navMode: string; bestFor: string[]; mobile: string; specLine: string;
  spec: { container: number; columns: number; gutter: number; cardCols: number[]; statsCols: number[]; quoteCols: number[]; breakpoints: number[]; itemGap: number; sectionPad: number[]; heroPadY: number[]; radiusScale: number };
  crap: { C: string; R: string; A: string; P: string };
}

function fmtEta(min: number | null): string {
  if (min == null) return "—";
  if (min < 1) return "moments";
  if (min < 60) return `≈ ${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  if (h < 36) return `≈ ${h}h ${Math.round(min % 60)}m`;
  return `≈ ${Math.round(min / 1440)} days`;
}

// ─── Phase segment bar — the 11 deliberate steps ──────────────────────
function PhaseBar({ job, phases }: { job: JobView; phases: { key: string; label: string; minutes: number }[] }) {
  return (
    <div className="flex gap-[3px]" role="progressbar" aria-valuenow={Math.round(job.overallProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
      {phases.map((p, i) => {
        const done = i < job.phaseIndex;
        const current = i === job.phaseIndex;
        return (
          <div
            key={p.key}
            title={`${p.label} · ${p.minutes} beast-min${done ? " · done" : current ? " · in progress" : ""}`}
            className={`h-2 flex-1 rounded-full transition-all duration-700 ${done ? "bg-amber-400" : current ? "bg-amber-400/60 animate-pulse" : "bg-stone-800"}`}
          />
        );
      })}
    </div>
  );
}

function PaletteDots({ design }: { design: JobView["design"] }) {
  const { bg, surface, ink, accent } = design.colors;
  return (
    <div className="flex items-center gap-1" title={`${design.paletteName} · ${design.pairingName}`}>
      {[bg, surface, ink, accent].map((c, i) => (
        <span key={i} className="h-3.5 w-3.5 rounded-full border border-white/15" style={{ background: c }} />
      ))}
    </div>
  );
}

function BeastMark({ size = 34 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 shadow-[0_0_24px_rgba(245,158,11,0.35)]"
      style={{ width: size, height: size }}
    >
      <div className="flex gap-[3px]">
        <span className="h-2 w-2 rounded-full bg-stone-950" />
        <span className="h-2 w-2 rounded-full bg-stone-950" />
      </div>
    </div>
  );
}

export default function Studio() {
  const [data, setData] = useState<StudioState | null>(null);
  const [library, setLibrary] = useState<BookLesson[]>([]);
  const [layouts, setLayouts] = useState<LayoutBook[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [preview, setPreview] = useState<JobView | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const { toast } = useToast();
  const dataRef = useRef<StudioState | null>(null);
  dataRef.current = data;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tick", { method: "POST", cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* the Beast keeps working even if a tick is dropped */
    }
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/library")
      .then((r) => (r.ok ? r.json() : { library: [], layouts: [] }))
      .then((d) => {
        setLibrary(d.library ?? []);
        setLayouts(d.layouts ?? []);
      })
      .catch(() => {});
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 4000);
    return () => clearInterval(iv);
  }, [refresh]);

  const downloadOne = async (job: JobView) => {
    try {
      const res = await fetch(`/api/download/${job.id}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${job.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "Site downloaded", description: `${job.name} is yours — index.html, design notes and license.` });
      refresh();
    } catch {
      toast({ title: "Download failed", description: "Try again in a moment.", variant: "destructive" });
    }
  };

  const downloadAndClear = async () => {
    setDownloadingAll(true);
    try {
      const res = await fetch("/api/download-all");
      if (!res.ok) {
        toast({ title: "Nothing on the shelf yet", description: "The Beast hasn't shipped a site — give it a few beats." });
        setDownloadingAll(false);
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `beast-shelf-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      setConfirmClear(false);
      setClearing(true);
      const cleared = await fetch("/api/clear", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => r.json());
      toast({
        title: "Shelf downloaded & cleared",
        description: `${cleared.cleared ?? 0} site${cleared.cleared === 1 ? "" : "s"} are in your zip. The Beast starts the next commissions immediately.`,
      });
      setClearing(false);
      await refresh();
    } catch {
      toast({ title: "Download failed", description: "Try again in a moment.", variant: "destructive" });
      setClearing(false);
    } finally {
      setDownloadingAll(false);
    }
  };

  const year = new Date().getFullYear();
  const s = data?.settings;
  const feed: (DelibLine & { name: string })[] =
    data?.active.flatMap((j) => j.deliberation.slice(-4).map((d) => ({ ...d, name: j.name }))).sort((a, b) => a.t - b.t).slice(-14) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-200 selection:bg-amber-400/30">
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(245,158,11,0.13),transparent_70%)]" />

      {/* ── Header ── */}
      <header className="relative border-b border-stone-800/80 bg-stone-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <BeastMark />
          <div className="mr-auto">
            <h1 className="font-[family-name:var(--font-fraunces)] text-xl font-bold tracking-tight text-stone-100 sm:text-2xl">
              THE BEAST <span className="text-amber-400">·</span> <span className="text-stone-400 font-normal italic text-base sm:text-lg">autonomous web studio</span>
            </h1>
            <p className="text-xs text-stone-500">
              Raised on 12 design books · {data?.stats.totalPhases ?? 11} deliberate phases per site · never rushed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)} className="border-stone-700 bg-stone-900 hover:bg-stone-800 hover:text-amber-300">
              <Library className="mr-1.5 h-4 w-4" /> Library
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="border-stone-700 bg-stone-900 hover:bg-stone-800 hover:text-amber-300">
              <Settings2 className="mr-1.5 h-4 w-4" /> Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {!data ? (
          <div className="grid gap-4 pt-10">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-stone-800 bg-stone-900/50" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Stats band ── */}
            <section aria-label="Studio stats" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Sites shipped", value: data.stats.shipped, icon: Sparkles },
                { label: "On the bench", value: data.stats.active, icon: Hammer },
                { label: "Beast hours", value: data.stats.beastHours, icon: Clock },
                { label: "Days in operation", value: data.stats.daysRunning, icon: SunMoon },
                { label: "Sites / day (forecast)", value: data.stats.sitesPerDay, icon: FlaskConical },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label} className="border-stone-800 bg-stone-900/60">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-amber-400/10 p-2 text-amber-400"><Icon className="h-4 w-4" /></div>
                    <div>
                      <div className="font-[family-name:var(--font-fraunces)] text-2xl font-bold leading-none text-stone-100">{value}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-stone-500">{label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {/* ── Workbenches ── */}
              <section aria-label="Workbenches" className="lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-stone-100">The workbenches</h2>
                  <Badge variant="outline" className="border-amber-400/40 text-amber-300">{data.stats.workbenches} benches · pace ×{data.settings.pace}</Badge>
                </div>
                <div className="grid gap-4">
                  {data.active.length === 0 && (
                    <Card className="border-dashed border-stone-800 bg-stone-900/40">
                      <CardContent className="p-6 text-center text-sm text-stone-500">All benches idle — the Beast respawns commissions on the next tick.</CardContent>
                    </Card>
                  )}
                  {data.active.map((job) => (
                    <Card key={job.id} className="border-stone-800 bg-stone-900/60 transition-colors hover:border-stone-700">
                      <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="bg-amber-400/10 text-amber-300 hover:bg-amber-400/10">Bench {job.workbench}</Badge>
                            <CardTitle className="truncate font-[family-name:var(--font-fraunces)] text-lg text-stone-100">{job.name}</CardTitle>
                            <Badge variant="outline" className="border-stone-700 text-stone-400">{job.archetypeLabel}</Badge>
                          </div>
                          <p className="mt-1.5 text-sm text-amber-200/80">{job.phaseVerb}…</p>
                        </div>
                        <PaletteDots design={job.design} />
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <PhaseBar job={job} phases={data.phases} />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                          <span><span className="font-semibold text-stone-300">{job.phaseLabel}</span> — phase {Math.min(job.phaseIndex + 1, data.phases.length)} of {data.phases.length}</span>
                          <span>{Math.round(job.overallProgress * 100)}% · {fmtEta(job.etaRealMinutes)} to ship</span>
                        </div>
                        <Progress value={job.overallProgress * 100} className="mt-2 h-1 bg-stone-800 [&>div]:bg-amber-400/70" />
                        {job.deliberation.length > 0 && (
                          <p className="mt-3 line-clamp-2 rounded-lg border border-stone-800 bg-stone-950/60 p-2.5 font-mono text-[11px] leading-relaxed text-stone-400">
                            <span className="text-amber-400/90">beast:</span> {job.deliberation[job.deliberation.length - 1].text}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* ── Deliberation feed ── */}
                <h2 className="mb-3 mt-8 font-[family-name:var(--font-fraunces)] text-lg font-semibold text-stone-100">Deliberation log — the Beast reasons out loud</h2>
                <Card className="border-stone-800 bg-[#0b0a08]">
                  <ScrollArea className="max-h-72">
                    <CardContent className="p-4 font-mono text-[11.5px] leading-relaxed">
                      {feed.length === 0 && <p className="text-stone-600">The Beast is warming up…</p>}
                      {feed.map((l, i) => (
                        <p key={i} className="py-0.5 text-stone-400">
                          <span className="text-stone-600">{new Date(l.t).toLocaleTimeString("en-US", { hour12: false })}</span>{" "}
                          <span className="text-amber-400/80">[{l.phase}]</span>{" "}
                          <span className="text-stone-300">{l.name}:</span> {l.text}
                        </p>
                      ))}
                    </CardContent>
                  </ScrollArea>
                </Card>
              </section>

              {/* ── Schedule ── */}
              <section aria-label="Progress schedule">
                <h2 className="mb-3 font-[family-name:var(--font-fraunces)] text-lg font-semibold text-stone-100">Progress schedule</h2>
                <Card className="border-stone-800 bg-stone-900/60">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium text-stone-400">Next 7 days — planned output</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-4 gap-2 p-4 pt-0 sm:grid-cols-7 lg:grid-cols-4">
                    {data.schedule.map((d, i) => (
                      <div key={d.date} className={`rounded-xl border p-2 text-center ${i === 0 ? "border-amber-400/50 bg-amber-400/10" : "border-stone-800 bg-stone-950/40"}`}>
                        <div className={`text-[10px] uppercase tracking-wide ${i === 0 ? "text-amber-300" : "text-stone-500"}`}>{i === 0 ? "Today" : d.label.split(",")[0]}</div>
                        <div className="mt-1 font-[family-name:var(--font-fraunces)] text-lg font-bold text-stone-100">{d.forecast}</div>
                        <div className="text-[9px] text-stone-600">{d.label.split(",")[1] ?? d.label}</div>
                      </div>
                    ))}
                  </CardContent>
                  <CardContent className="p-4 pt-0 text-xs leading-relaxed text-stone-500">
                    The Beast never idles: the moment a bench frees up, a fresh commission is accepted. Close this tab for a week — progress is counted in real time, and it all catches up on your return.
                  </CardContent>
                </Card>

                {/* Bulk actions */}
                <Card className="mt-4 border-amber-400/20 bg-gradient-to-b from-amber-400/[0.07] to-stone-900/60">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-amber-400" />
                      <h3 className="text-sm font-semibold text-stone-200">The shelf</h3>
                      <Badge className="ml-auto bg-amber-400 text-stone-950 hover:bg-amber-400">{data.shipped.length}</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-stone-500">
                      Finished sites wait here with your copyright stamped in every footer. Download them all, then clear the shelf — the Beast keeps building either way.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <Button
                        className="w-full bg-amber-400 font-semibold text-stone-950 hover:bg-amber-300"
                        disabled={data.shipped.length === 0 || downloadingAll}
                        onClick={() => setConfirmClear(true)}
                      >
                        <Download className="mr-1.5 h-4 w-4" /> Download all &amp; clear shelf
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* API vault summary */}
                <Card className="mt-4 border-stone-800 bg-stone-900/60">
                  <CardContent className="flex items-center gap-3 p-4">
                    <KeyRound className="h-4 w-4 text-amber-400" />
                    <div className="mr-auto text-xs text-stone-500">
                      AI key pool: <span className="font-semibold text-stone-300">{s?.vaultCount ?? 0}</span> key{(s?.vaultCount ?? 0) === 1 ? "" : "s"} · round-robin · cooldown
                      <br /><span className="text-stone-600">Optional — the Beast writes its own copy without keys.</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} className="text-amber-300 hover:bg-stone-800 hover:text-amber-200">Manage</Button>
                  </CardContent>
                </Card>
              </section>
            </div>

            {/* ── Shelf ── */}
            <section aria-label="Shipped sites" className="mt-10">
              <h2 className="mb-3 font-[family-name:var(--font-fraunces)] text-lg font-semibold text-stone-100">
                The shelf <span className="text-stone-500">— shipped with © {year} {s?.copyrightHolder ?? ""}</span>
              </h2>
              {data.shipped.length === 0 ? (
                <Card className="border-dashed border-stone-800 bg-stone-900/40">
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-stone-500">Nothing shipped yet. First sites land on the shelf in about 15 beast-hours of work — watch the benches.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.shipped.map((job) => (
                    <Card key={job.id} className="group overflow-hidden border-stone-800 bg-stone-900/60 transition-colors hover:border-amber-400/40">
                      <div className="relative h-28 overflow-hidden border-b border-stone-800" style={{ background: job.design.colors.bg }}>
                        <div className="absolute inset-0 opacity-90 transition-transform duration-700 group-hover:scale-[1.04]">
                          <div className="absolute left-5 top-5 h-3 w-24 rounded-sm" style={{ background: job.design.colors.ink, opacity: 0.85 }} />
                          <div className="absolute left-5 top-11 h-2 w-16 rounded-sm" style={{ background: job.design.colors.ink, opacity: 0.35 }} />
                          <div className="absolute left-5 top-[68px] h-6 w-20 rounded-md" style={{ background: job.design.colors.accent }} />
                          <div className="absolute right-[-12px] top-3 h-24 w-24 rotate-12 rounded-[40%]" style={{ background: job.design.colors.accent, opacity: 0.5 }} />
                          <div className="absolute right-8 bottom-[-14px] h-20 w-20 rounded-[45%]" style={{ background: job.design.colors.ink, opacity: 0.25 }} />
                        </div>
                        <div className="absolute bottom-2 right-2"><PaletteDots design={job.design} /></div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate font-[family-name:var(--font-fraunces)] text-base font-semibold text-stone-100">{job.name}</h3>
                          {job.audit?.contrast.pass && <Badge variant="outline" className="shrink-0 border-emerald-500/40 text-[10px] text-emerald-400">C.R.A.P. ✓</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {job.archetypeLabel} · {job.design.layoutName?.split(" — ")[0] ?? job.design.heroVariant} · {job.design.paletteName}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-stone-600" title={`${job.design.layoutName} — source: ${job.design.layoutSource}`}>
                          {job.design.readingPattern}-pattern · {job.design.pairingName}
                        </p>
                        {job.audit?.contrast.detail && (
                          <p className="mt-1.5 truncate font-mono text-[10px] text-stone-600" title={job.audit.contrast.detail}>{job.audit.contrast.detail}</p>
                        )}
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setPreview(job)} className="h-8 flex-1 border-stone-700 bg-stone-900 text-xs hover:bg-stone-800 hover:text-amber-300">
                            <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                          </Button>
                          <Button size="sm" onClick={() => downloadOne(job)} className="h-8 flex-1 bg-amber-400 text-xs font-semibold text-stone-950 hover:bg-amber-300">
                            <Download className="mr-1 h-3.5 w-3.5" /> .zip
                          </Button>
                        </div>
                        {job.shippedAt && <p className="mt-2 text-[10px] text-stone-600">Shipped {new Date(job.shippedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* ── Footer (sticky bottom via mt-auto) ── */}
      <footer className="relative mt-auto border-t border-stone-800/80 bg-stone-950/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-stone-500 sm:px-6">
          <p>© {year} {s?.copyrightHolder ?? "…"} · {s?.copyrightNote ?? "All rights reserved."}</p>
          <p className="flex items-center gap-1.5">
            Built by THE BEAST · <Github className="h-3.5 w-3.5" /> key-pool pattern adapted from whatsapp-qr-app
          </p>
        </div>
      </footer>

      {/* ── Preview dialog ── */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl border-stone-800 bg-stone-950 p-0 sm:max-w-4xl">
          <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-stone-800 p-4">
            <div>
              <DialogTitle className="font-[family-name:var(--font-fraunces)] text-stone-100">{preview?.name}</DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                {preview?.archetypeLabel} · {preview?.design.paletteName} · {preview?.design.pairingName}
              </DialogDescription>
              <p className="mt-1 text-[11px] text-amber-400/90" title={preview?.design.layoutSource}>
                {preview?.design.layoutName} · {preview?.design.readingPattern}-pattern
              </p>
            </div>
            {preview && (
              <Button size="sm" onClick={() => downloadOne(preview)} className="bg-amber-400 font-semibold text-stone-950 hover:bg-amber-300">
                <Download className="mr-1.5 h-4 w-4" /> Download .zip
              </Button>
            )}
          </DialogHeader>
          <div className="h-[70vh] w-full overflow-hidden rounded-b-lg bg-white">
            {preview && <iframe title={`Preview of ${preview.name}`} src={`/api/preview/${preview.id}`} className="h-full w-full" sandbox="allow-same-origin" />}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Clear confirm ── */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="border-stone-800 bg-stone-950 text-stone-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-[family-name:var(--font-fraunces)]">Download all &amp; clear the shelf?</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-400">
              You&apos;ll get one zip with all {data?.shipped.length ?? 0} shipped sites (each with index.html, design notes and your license). After the download, the shelf is cleared — the Beast starts fresh commissions and keeps building.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stone-700 bg-stone-900 hover:bg-stone-800 hover:text-stone-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={downloadAndClear} disabled={downloadingAll} className="bg-amber-400 font-semibold text-stone-950 hover:bg-amber-300">
              {downloadingAll ? "Packaging…" : "Download & clear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LibraryDialog open={libraryOpen} onOpenChange={setLibraryOpen} library={library} layouts={layouts} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} data={data} onSaved={refresh} />
    </div>
  );
}

// ─── Library dialog — the Beast's education: layouts first, then books ─
function LibraryDialog({ open, onOpenChange, library, layouts }: { open: boolean; onOpenChange: (o: boolean) => void; library: BookLesson[]; layouts: LayoutBook[] }) {
  const [tab, setTab] = useState<"layouts" | "books">("layouts");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-stone-800 bg-stone-950 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-fraunces)] text-stone-100">The Beast&apos;s education</DialogTitle>
          <DialogDescription className="text-stone-500">
            Twelve fully specified layouts and twelve design books. Every decision cites its source.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "layouts" ? "default" : "outline"} onClick={() => setTab("layouts")}
            className={tab === "layouts" ? "bg-amber-400 font-semibold text-stone-950 hover:bg-amber-300" : "border-stone-700 bg-stone-900 hover:bg-stone-800 hover:text-amber-300"}>
            The Layout Book (12)
          </Button>
          <Button size="sm" variant={tab === "books" ? "default" : "outline"} onClick={() => setTab("books")}
            className={tab === "books" ? "bg-amber-400 font-semibold text-stone-950 hover:bg-amber-300" : "border-stone-700 bg-stone-900 hover:bg-stone-800 hover:text-amber-300"}>
            The 12 Books
          </Button>
        </div>
        <ScrollArea className="max-h-[60vh] pr-3">
          {tab === "layouts" ? (
            <div className="grid gap-3">
              {layouts.length === 0 && <p className="text-sm text-stone-500">Loading the layout book…</p>}
              {layouts.map((l, i) => (
                <div key={l.id} className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-[family-name:var(--font-fraunces)] text-sm font-bold text-amber-400">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="text-sm font-semibold text-stone-100">{l.name}</h3>
                    <Badge variant="outline" className="border-stone-700 text-[10px] text-stone-400">{l.readingPattern}-pattern</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-stone-300">{l.arrangement}</p>
                  <p className="mt-2 font-mono text-[10px] text-stone-500">{l.specLine} · breakpoints {l.spec.breakpoints.join("/")}px</p>
                  <p className="mt-1.5 text-[11px] text-stone-500"><span className="text-stone-400">Source:</span> {l.source}</p>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[10px] text-stone-500 sm:grid-cols-2">
                    <span><span className="font-semibold text-stone-400">C</span> {l.crap.C}</span>
                    <span><span className="font-semibold text-stone-400">R</span> {l.crap.R}</span>
                    <span><span className="font-semibold text-stone-400">A</span> {l.crap.A}</span>
                    <span><span className="font-semibold text-stone-400">P</span> {l.crap.P}</span>
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-stone-600">
                    Sections: {l.sectionOrder.join(" → ")} · Mobile: {l.mobile}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
            {library.length === 0 && <p className="text-sm text-stone-500">Loading the curriculum…</p>}
            {library.map((b, i) => (
              <div key={b.id} className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-fraunces)] text-sm font-bold text-amber-400">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-sm font-semibold text-stone-100">{b.title}</h3>
                  <span className="text-xs text-stone-500">— {b.author}, {b.year}</span>
                </div>
                <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs leading-relaxed text-stone-400">
                  {b.doctrine.slice(0, 3).map((d, j) => <li key={j}>{d}</li>)}
                </ul>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-stone-600">Powers: {b.powers}</p>
              </div>
            ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Settings dialog — copyright, pace, API key vault ─────────────────
function SettingsDialog({ open, onOpenChange, data, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; data: StudioState | null; onSaved: () => void }) {
  const { toast } = useToast();
  const [holder, setHolder] = useState("");
  const [note, setNote] = useState("");
  const [pace, setPace] = useState("6");
  const [benches, setBenches] = useState("3");
  const [respawn, setRespawn] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const [vault, setVault] = useState<VaultView[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && data) {
      setHolder(data.settings.copyrightHolder);
      setNote(data.settings.copyrightNote);
      setPace(String(data.settings.pace));
      setBenches(String(data.settings.workbenches));
      setRespawn(data.settings.autoRespawn);
      fetch("/api/settings").then((r) => r.json()).then((d) => setVault(d.vault ?? [])).catch(() => {});
    }
  }, [open, data]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          copyrightHolder: holder,
          copyrightNote: note,
          pace: Number(pace),
          workbenches: Number(benches),
          autoRespawn: respawn,
          newApiKey: newKey || undefined,
          newKeyLabel: keyLabel || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Save failed");
      setVault(d.vault ?? []);
      setNewKey("");
      setKeyLabel("");
      toast({ title: "Studio settings saved", description: newKey ? "Key stored server-side — only you can see the masked version." : "The Beast adjusts immediately." });
      onSaved();
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeKey = async (id: string) => {
    await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ removeKeyId: id }) });
    const d = await fetch("/api/settings").then((r) => r.json());
    setVault(d.vault ?? []);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-stone-800 bg-stone-950 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-fraunces)] text-stone-100">Studio settings</DialogTitle>
          <DialogDescription className="text-stone-500">Copyright stamp, the Beast&apos;s pace, and the API key pool.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="holder" className="text-stone-300">Copyright holder (stamped on every site)</Label>
            <Input id="holder" value={holder} onChange={(e) => setHolder(e.target.value)} className="border-stone-700 bg-stone-900 text-stone-200" placeholder="Your name or company" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="note" className="text-stone-300">Copyright note</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} className="border-stone-700 bg-stone-900 text-stone-200" placeholder="All rights reserved." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-stone-300">Pace (beast-min / real-min)</Label>
              <Select value={pace} onValueChange={setPace}>
                <SelectTrigger className="border-stone-700 bg-stone-900 text-stone-200"><SelectValue /></SelectTrigger>
                <SelectContent className="border-stone-800 bg-stone-900 text-stone-200">
                  <SelectItem value="1">1 — contemplative (site ≈ 15h)</SelectItem>
                  <SelectItem value="6">6 — steady (site ≈ 2.5h)</SelectItem>
                  <SelectItem value="24">24 — driven (site ≈ 38m)</SelectItem>
                  <SelectItem value="120">120 — obsessed (site ≈ 8m)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-stone-300">Workbenches</Label>
              <Select value={benches} onValueChange={setBenches}>
                <SelectTrigger className="border-stone-700 bg-stone-900 text-stone-200"><SelectValue /></SelectTrigger>
                <SelectContent className="border-stone-800 bg-stone-900 text-stone-200">
                  {[1, 2, 3, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>{n} site{n > 1 ? "s" : ""} at once</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900/50 p-3">
            <div>
              <p className="text-sm text-stone-300">Auto-respawn commissions</p>
              <p className="text-xs text-stone-500">Keep every bench full, forever. Untick to stop taking new work.</p>
            </div>
            <Switch checked={respawn} onCheckedChange={setRespawn} className="data-[state=checked]:bg-amber-400" />
          </div>

          <Separator className="bg-stone-800" />

          <div>
            <div className="mb-1 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-400" />
              <Label className="text-stone-300">AI key pool (optional)</Label>
            </div>
            <p className="mb-2 text-xs leading-relaxed text-stone-500">
              Same doctrine as your whatsapp-qr-app: numbered slots, provider auto-detected from the key&apos;s shape, round-robin across healthy keys, cooldown on failure, graceful fallback. Keys are stored server-side and never returned raw.
            </p>
            <div className="flex gap-2">
              <Input value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} placeholder="Label (e.g. OpenRouter)" className="w-36 border-stone-700 bg-stone-900 text-stone-200" />
              <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Paste key (sk-…, gsk_…, AIza…)" type="password" className="flex-1 border-stone-700 bg-stone-900 text-stone-200" />
              <Button size="icon" variant="outline" onClick={save} disabled={!newKey || saving} className="shrink-0 border-stone-700 bg-stone-900 hover:bg-stone-800 hover:text-amber-300" aria-label="Add key">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 grid gap-2">
              {vault.length === 0 && <p className="text-xs text-stone-600">Vault empty — the Beast writes its own copy (and says so in the log when it does).</p>}
              {vault.map((k) => (
                <div key={k.id} className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/50 p-2.5 text-xs">
                  <span className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">{k.provider}</span>
                  <span className="text-stone-300">{k.label}</span>
                  <span className="font-mono text-stone-500">{k.masked}</span>
                  <Badge variant="outline" className={`ml-auto text-[10px] ${k.lastStatus === "cooldown" ? "border-rose-500/40 text-rose-400" : "border-emerald-500/40 text-emerald-400"}`}>{k.lastStatus}</Badge>
                  <button onClick={() => removeKey(k.id)} aria-label={`Remove ${k.label}`} className="text-stone-600 transition-colors hover:text-rose-400"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving} className="bg-amber-400 font-semibold text-stone-950 hover:bg-amber-300">
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
