import { NextRequest, NextResponse } from 'next/server';
import {
  loadState, bootStudio, commission, saveState, drainExclusive, isWorking, clearWorkspace, setOwner,
  runTaskNow, setValues, pushToGithub, adoptVaultState, workspaceBytes, WORKSPACE_BUDGET_BYTES,
  STAGES, DEVICE_CLASSES, CONCURRENCY, ENGINE_VERSION,
} from '@/lib/beast/engine';
import { githubConfigured } from '@/lib/beast/storage';
import { aiEnabled, vaultKeys } from '@/lib/beast/ai';
import { poolStatus } from '@/lib/beast/aipool';
import { LAYOUTS } from '@/lib/beast/layouts';
import { layoutVariety } from '@/lib/beast/reasoner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function publicState(state: ReturnType<typeof loadState>) {
  return {
    version: state.version,
    cycle: state.cycle,
    startedAt: state.startedAt,
    working: isWorking(),
    owner: state.owner,
    concurrency: CONCURRENCY,
    stages: STAGES,
    devices: DEVICE_CLASSES,
    layoutCount: LAYOUTS.length,
    github: { configured: githubConfigured() },
    ai: { enabled: aiEnabled(), pool: poolStatus(vaultKeys()) },
    workspace: {
      bytes: workspaceBytes(state),
      budget: WORKSPACE_BUDGET_BYTES,
      sites: state.sites.length,
      maxSites: CONCURRENCY,
    },
    sites: state.sites.map((s) => {
      const accepted = s.tasks.filter((t) => t.status === 'accepted').length;
      const total = s.tasks.length;
      return {
        id: s.id,
        brand: s.brand,
        nicheLabel: s.nicheLabel,
        city: s.city,
        stageIndex: s.stageIndex,
        status: s.status,
        price: s.price,
        startedAt: s.startedAt,
        design: s.design,
        palette: s.palette,
        qa: s.qa ?? null,
        copyright: s.copyright,
        log: s.log.slice(-5),
        // v4 task ledger + artifacts (the progress panel + Mission Control)
        tasks: s.tasks.map((t) => ({
          id: t.id, kind: t.kind, title: t.title, why: t.why, status: t.status,
          pageKey: t.pageKey ?? null, device: t.device ?? null, detour: t.detour ?? false,
          attempts: t.attempts, precision: t.precision, note: t.note ?? null, rules: t.rules.length,
          acceptedAt: t.acceptedAt ?? null,
        })),
        pages: s.art.pages ?? [],
        brief: s.art.brief ?? null,
        revisions: s.art.revisions ?? null,
        git: s.art.git ?? null,
        valuesSummary: s.art.values ? {
          phones: s.art.values.phones.length,
          products: s.art.values.products.length,
          socials: s.art.values.socials.length,
        } : null,
        images: (s.art.images ?? []).map((r) => ({ slotId: r.slotId, status: r.status, source: r.source, license: r.license ?? null })),
        // v5 reasoner + size + layout variety (Mission Control)
        reasoning: {
          findings: s.art.findings?.length ?? 0,
          demands: s.art.demands?.length ?? 0,
          personas: s.art.personas?.length ?? 0,
          pagesArranged: Object.keys(s.art.pageLayouts ?? {}).length,
          layouts: layoutVariety(s.art.pageLayouts),
          topPains: (s.art.findings ?? []).slice(0, 4).map((f) => f.complaintId),
        },
        size: s.art.sizeReport ?? null,
        progress: total > 0 ? Math.round((accepted / total) * 100) : 0,
        taskCounts: {
          total,
          accepted,
          queued: s.tasks.filter((t) => t.status === 'queued').length,
          deferred: s.tasks.filter((t) => t.status === 'deferred').length,
        },
      };
    }),
    log: state.log.slice(0, 200), // the actual execution log, newest first
    transcript: state.transcript.slice(0, 60),
  };
}

export async function GET() {
  const state = loadState();
  await adoptVaultState(state); // cold boot? adopt the vaulted studio (durable memory)
  bootStudio(state);            // empty floor? commission real sites right now
  void drainExclusive(state, { maxTasks: 4, maxMs: 40_000 }).catch(() => {}); // start working immediately
  return NextResponse.json(publicState(state));
}

export async function POST(req: NextRequest) {
  const state = loadState();
  const body = (await req.json().catch(() => ({}))) as {
    action?: string; owner?: string; siteId?: string; values?: unknown;
  };
  switch (body.action) {
    // the one honest work control: drain the WHOLE pending ledger now
    case 'work': {
      bootStudio(state);
      const report = await drainExclusive(state, { maxTasks: 400, maxMs: 50_000 });
      return NextResponse.json({
        ok: true, jobs: report.jobs.slice(-8), executed: report.executed,
        remaining: report.remaining, skipped: report.skipped ?? false, ...publicState(state),
      });
    }
    case 'commission': {
      const inStudio = state.sites.filter((s) => s.status === 'in-studio').length;
      if (inStudio >= CONCURRENCY) {
        return NextResponse.json({ ok: true, commissioned: 0, message: `Studio floor is full — ${CONCURRENCY} sites already in the studio.`, ...publicState(state) });
      }
      const site = commission(state);
      saveState(state);
      return NextResponse.json({ ok: true, commissioned: 1, jobs: [`Commissioned ${site.brand} — ${site.nicheLabel} in ${site.city}`], ...publicState(state) });
    }
    case 'runTask': {
      const jobs = await runTaskNow(state, body.siteId);
      return NextResponse.json({ ok: true, jobs, ...publicState(state) });
    }
    case 'clear': {
      clearWorkspace(state);
      bootStudio(state);
      return NextResponse.json({ ok: true, cleared: true, ...publicState(state) });
    }
    case 'setOwner': {
      await setOwner(state, String(body.owner ?? ''));
      return NextResponse.json({ ok: true, ...publicState(state) });
    }
    case 'getValues': {
      const site = state.sites.find((s) => s.id === body.siteId);
      if (!site) return NextResponse.json({ error: 'site not found' }, { status: 404 });
      return NextResponse.json({ ok: true, values: site.art.values ?? null });
    }
    case 'setValues': {
      if (!body.siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
      const res = await setValues(state, body.siteId, body.values);
      return NextResponse.json({ ...res, ...publicState(state) }, { status: res.ok ? 200 : 400 });
    }
    case 'pushGithub': {
      const jobs = await pushToGithub(state, body.siteId ?? 'all');
      return NextResponse.json({ ok: true, jobs, ...publicState(state) });
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
