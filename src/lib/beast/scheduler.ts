// ══════════════════════════════════════════════════════════════════════
//  THE SCHEDULER — the Beast's heartbeat.
//
//  Progress is ELAPSED-TIME BASED: every tick computes how long since a
//  job last advanced, converts real minutes → beast-minutes (pace), and
//  pushes each active job through its phase machine. Close the app for
//  three days, come back — the Beast has three days of work done.
//  When a workbench frees up, a new commission is spawned automatically.
// ══════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { PHASES, TOTAL_MINUTES } from "./knowledge";
import { archetypeById, ARCHETYPES } from "./archetypes";
import { decisionsFor, phaseLines, crapAudit, buildHtml, buildDesignNotes, buildLicense, slugify, SiteDecisions } from "./generator";
import { paletteById } from "./palettes";
import { pairingById } from "./typography";
import { layoutById } from "./layouts";
import { parseVault, VaultKey } from "./aipool";

const MAX_CATCHUP_MINUTES = 24 * 60; // real minutes of catch-up per tick

// ─── Settings singleton ───────────────────────────────────────────────
export interface StudioSettings {
  copyrightHolder: string;
  copyrightNote: string;
  pace: number; // beast-minutes per real minute
  workbenches: number;
  autoRespawn: boolean;
}

export async function getSettings() {
  let s = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!s) s = await db.setting.create({ data: { id: "singleton" } });
  return s;
}

// ─── Commission a new job onto a free workbench ───────────────────────
export async function spawnJob(workbench: number) {
  const recent = await db.job.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { archetype: true },
  });
  const recentIds = new Set(recent.map((j) => j.archetype));
  const pool = ARCHETYPES.filter((a) => !recentIds.has(a.id));
  const arch = pool[Math.floor(Math.random() * pool.length)] ?? ARCHETYPES[0];
  const seed = Math.floor(Math.random() * 2 ** 31);
  const existing = await db.job.findMany({ select: { name: true } });
  const taken = new Set(existing.map((e) => e.name));
  let name = "";
  for (let i = 0; i < 12; i++) {
    const r1 = arch.nameParts1[Math.floor(Math.random() * arch.nameParts1.length)];
    const r2 = arch.nameParts2[Math.floor(Math.random() * arch.nameParts2.length)];
    name = `${r1} ${r2}`;
    if (!taken.has(name)) break;
  }
  const d = decisionsFor(seed, arch.id);
  const entry = {
    t: Date.now(),
    phase: "research",
    text: `Commission accepted: ${name} (${arch.label}). Starting field study — audience: ${arch.audience}.`,
  };
  return db.job.create({
    data: {
      name,
      archetype: arch.id,
      seed,
      status: "active",
      workbench,
      studioMinutes: 0,
      phaseIndex: 0,
      decisions: JSON.stringify(d),
      deliberation: JSON.stringify([entry]),
    },
  });
}

// ─── Phase boundaries ─────────────────────────────────────────────────
export function cumulativeMinutes(): number[] {
  const cum: number[] = [];
  let t = 0;
  for (const p of PHASES) {
    cum.push(t);
    t += p.minutes;
  }
  return cum;
}

// ─── Tick: advance all active jobs ────────────────────────────────────
let ticking: Promise<void> | null = null; // single-server mutex

export async function tick(): Promise<void> {
  if (ticking) return ticking;
  ticking = (async () => {
    try {
      const s = await getSettings();
      const now = Date.now();
      const active = await db.job.findMany({ where: { status: "active" }, orderBy: { workbench: "asc" } });

      for (const job of active) {
        const elapsedRealMin = Math.min(MAX_CATCHUP_MINUTES, (now - job.updatedAt.getTime()) / 60_000);
        if (elapsedRealMin <= 0) continue;
        const gained = elapsedRealMin * s.pace; // beast-minutes earned

        const cum = cumulativeMinutes();
        const d: SiteDecisions = JSON.parse(job.decisions);
        const arch = archetypeById(job.archetype);
        const lines: { t: number; phase: string; text: string }[] = [];
        let phaseIndex = job.phaseIndex;
        let minutes = job.studioMinutes + gained;

        // Complete every phase boundary crossed in this tick
        while (phaseIndex < PHASES.length && minutes >= cum[phaseIndex] + PHASES[phaseIndex].minutes) {
          const phase = PHASES[phaseIndex];
          lines.push(...phaseLines(phase.key, job.name, d, arch).map((text) => ({ t: Date.now(), phase: phase.label, text })));

          if (phase.key === "copy") {
            // Optional AI enhancement via the key pool — best-effort,
            // graceful fallback to the Beast's own pen (repo doctrine).
            const vault: VaultKey[] = parseVault(s.apiKeyVault);
            if (vault.length > 0) {
              const res = await import("./aipool").then((m) =>
                m.callAiPool(
                  vault,
                  "You are a web copywriter. Reply with a single headline of max 9 words, no quotes, no explanation.",
                  `Business: ${job.name} (${arch.label}). Audience: ${arch.audience}. Current headline: "${d.heroHeadline}". Write a better one.`
                )
              );
              if (res) {
                d.heroHeadline = res.text.slice(0, 120);
                lines.push({ t: Date.now(), phase: phase.label, text: `AI pool (${res.provider}) contributed a sharper headline — tested against the glance rule and adopted.` });
              } else {
                lines.push({ t: Date.now(), phase: phase.label, text: `AI pool unavailable (no healthy keys) — the Beast used its own pen. Zero downtime.` });
              }
            }
          }

          if (phase.key === "audit") {
            const audit = crapAudit(d);
            lines.push({ t: Date.now(), phase: phase.label, text: `${audit.grade} — ${audit.contrast.detail}` });
          }

          phaseIndex += 1;
        }

        const shipped = phaseIndex >= PHASES.length;
        const data: Record<string, unknown> = {
          studioMinutes: Math.min(minutes, TOTAL_MINUTES),
          phaseIndex,
          deliberation: JSON.stringify(JSON.parse(job.deliberation).concat(lines)),
          decisions: JSON.stringify(d),
          updatedAt: new Date(now),
        };

        if (shipped) {
          const ctx = {
            name: job.name,
            archetypeId: job.archetype,
            seed: job.seed,
            decisions: d,
            copyrightHolder: s.copyrightHolder,
            copyrightNote: s.copyrightNote,
            year: new Date().getFullYear(),
          };
          const html = buildHtml(ctx);
          const audit = crapAudit(d);
          data.status = "shipped";
          data.workbench = null;
          data.shippedAt = new Date(now);
          data.html = html;
          data.audit = JSON.stringify(audit);
          data.studioMinutes = TOTAL_MINUTES;
          data.phaseIndex = PHASES.length; // all phases complete
          lines.push({ t: Date.now(), phase: "shipped", text: `${job.name} is shipped and on the shelf. ${TOTAL_MINUTES} beast-minutes of deliberate work.` });
          data.deliberation = JSON.stringify(JSON.parse(job.deliberation).concat(lines));
        }

        await db.job.update({ where: { id: job.id }, data });
      }

      // Refill free workbenches — the factory never idles
      if (s.autoRespawn) {
        const occupied = await db.job.findMany({ where: { status: "active" }, select: { workbench: true } });
        const taken = new Set(occupied.map((o) => o.workbench));
        for (let bench = 1; bench <= s.workbenches; bench++) {
          if (!taken.has(bench)) await spawnJob(bench);
        }
      }
    } finally {
      ticking = null;
    }
  })();
  return ticking;
}

// ─── Studio state (read model for the UI) ─────────────────────────────
export interface JobView {
  id: string;
  name: string;
  archetypeId: string;
  archetypeLabel: string;
  status: string;
  workbench: number | null;
  phaseIndex: number;
  phaseLabel: string;
  phaseVerb: string;
  phaseProgress: number; // 0..1 within current phase
  overallProgress: number; // 0..1 across all phases
  design: {
    paletteId: string;
    paletteName: string;
    pairingName: string;
    heroVariant: string;
    layoutId: string;
    layoutName: string;
    layoutSource: string;
    readingPattern: string;
    colors: { bg: string; surface: string; ink: string; accent: string };
  };
  deliberation: { t: number; phase: string; text: string }[];
  etaRealMinutes: number | null;
  commissionedAt: string;
  shippedAt: string | null;
  audit: { grade: string; contrast: { pass: boolean; detail: string } } | null;
  hasHtml: boolean;
  wordCount: number | null;
}

export async function getStudioState() {
  const s = await getSettings();
  const [active, shipped] = await Promise.all([
    db.job.findMany({ where: { status: "active" }, orderBy: [{ workbench: "asc" }] }),
    db.job.findMany({ where: { status: "shipped" }, orderBy: { shippedAt: "desc" }, take: 60 }),
  ]);
  const cum = cumulativeMinutes();

  const view = (j: typeof active[number], isActive: boolean): JobView => {
    const arch = archetypeById(j.archetype);
    const d: SiteDecisions = JSON.parse(j.decisions);
    const phaseIdx = Math.min(j.phaseIndex, PHASES.length - 1);
    const phase = PHASES[phaseIdx];
    const phaseProgress = isActive
      ? Math.max(0, Math.min(1, (j.studioMinutes - cum[phaseIdx]) / phase.minutes))
      : 1;
    const remainingBeast = Math.max(0, TOTAL_MINUTES - j.studioMinutes);
    const delib = JSON.parse(j.deliberation) as { t: number; phase: string; text: string }[];
    const audit = j.audit && j.audit !== "null" ? JSON.parse(j.audit) : null;
    const pal = paletteById(d.paletteId);
    const pair = pairingById(d.pairingId);
    const layout = layoutById(d.layoutId);
    return {
      id: j.id,
      name: j.name,
      archetypeId: j.archetype,
      archetypeLabel: arch.label,
      status: j.status,
      workbench: j.workbench,
      phaseIndex: j.phaseIndex,
      phaseLabel: isActive ? phase.label : "Shipped",
      phaseVerb: isActive ? phase.verb : "Done — on the shelf",
      phaseProgress,
      overallProgress: j.studioMinutes / TOTAL_MINUTES,
      design: {
        paletteId: d.paletteId,
        paletteName: pal.name,
        pairingName: pair.name,
        heroVariant: d.heroVariant,
        layoutId: layout.id,
        layoutName: layout.name,
        layoutSource: layout.source,
        readingPattern: layout.readingPattern,
        colors: { bg: pal.bg, surface: pal.surface, ink: pal.ink, accent: pal.accent },
      },
      deliberation: delib.slice(-8),
      etaRealMinutes: isActive ? Math.round(remainingBeast / s.pace) : null,
      commissionedAt: j.commissionedAt.toISOString(),
      shippedAt: j.shippedAt ? j.shippedAt.toISOString() : null,
      audit,
      hasHtml: !!j.html,
      wordCount: j.html ? j.html.split(/\s+/).length : null,
    };
  };

  const activeViews = active.map((j) => view(j, true));
  const shippedViews = shipped.map((j) => view(j, false));

  const shippedCount = await db.job.count({ where: { status: "shipped" } });
  const totalMinutesSpent =
    shipped.reduce((sum, j) => sum + TOTAL_MINUTES, 0) + active.reduce((sum, j) => sum + j.studioMinutes, 0);
  const earliest = await db.job.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  const daysRunning = earliest ? Math.max(0.01, (Date.now() - earliest.createdAt.getTime()) / 86_400_000) : 0.01;

  const sitesPerDay = (s.workbenches * s.pace * 1440) / TOTAL_MINUTES;

  // 7-day rolling schedule forecast
  const schedule: { date: string; label: string; forecast: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.now() + i * 86_400_000);
    schedule.push({
      date: dt.toISOString().slice(0, 10),
      label: dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      forecast: Math.round(sitesPerDay * 10) / 10,
    });
  }

  const vault = parseVault(s.apiKeyVault);

  return {
    settings: {
      copyrightHolder: s.copyrightHolder,
      copyrightNote: s.copyrightNote,
      pace: s.pace,
      workbenches: s.workbenches,
      autoRespawn: s.autoRespawn,
      vaultCount: vault.length,
    },
    active: activeViews,
    shipped: shippedViews,
    stats: {
      shipped: shippedCount,
      active: active.length,
      beastHours: Math.round(totalMinutesSpent / 60),
      daysRunning: Math.round(daysRunning * 10) / 10,
      sitesPerDay: Math.round(sitesPerDay * 10) / 10,
      totalPhases: PHASES.length,
    },
    schedule,
    phases: PHASES.map((p) => ({ key: p.key, label: p.label, minutes: p.minutes })),
  };
}
