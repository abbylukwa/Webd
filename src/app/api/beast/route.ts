import { NextRequest, NextResponse } from 'next/server';
import {
  loadState, tick, forceDay, clearWorkspace, setOwner, runTaskNow, setValues, pushToGithub,
  STAGES, DEVICE_CLASSES, CONCURRENCY, ENGINE_VERSION,
} from '@/lib/beast/engine';
import { githubConfigured } from '@/lib/beast/storage';
import { aiEnabled } from '@/lib/beast/ai';
import { LAYOUTS } from '@/lib/beast/layouts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function publicState(state: ReturnType<typeof loadState>) {
  return {
    version: state.version,
    day: state.day,
    owner: state.owner,
    concurrency: CONCURRENCY,
    stages: STAGES,
    devices: DEVICE_CLASSES,
    layoutCount: LAYOUTS.length,
    github: { configured: githubConfigured() },
    ai: { enabled: aiEnabled() },
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
        startedDay: s.startedDay,
        design: s.design,
        palette: s.palette,
        qa: s.qa ?? null,
        copyright: s.copyright,
        log: s.log.slice(-3),
        // v3 task ledger + artifacts (Mission Control)
        tasks: s.tasks.map((t) => ({
          id: t.id, kind: t.kind, title: t.title, why: t.why, status: t.status,
          pageKey: t.pageKey ?? null, device: t.device ?? null, detour: t.detour ?? false,
          attempts: t.attempts, precision: t.precision, note: t.note ?? null,
        })),
        pages: s.art.pages ?? [],
        git: s.art.git ?? null,
        valuesSummary: s.art.values ? {
          phones: s.art.values.phones.length,
          products: s.art.values.products.length,
          socials: s.art.values.socials.length,
        } : null,
        images: (s.art.images ?? []).map((r) => ({ slotId: r.slotId, status: r.status, source: r.source, license: r.license ?? null })),
        progress: total > 0 ? Math.round((accepted / total) * 100) : 0,
        taskCounts: {
          total,
          accepted,
          queued: s.tasks.filter((t) => t.status === 'queued').length,
          deferred: s.tasks.filter((t) => t.status === 'deferred').length,
        },
      };
    }),
    transcript: state.transcript.slice(0, 60),
    log: state.log.slice(0, 14),
  };
}

export async function GET() {
  const state = loadState();
  await tick(state); // auto catch-up on missed real days
  return NextResponse.json(publicState(state));
}

export async function POST(req: NextRequest) {
  const state = loadState();
  const body = (await req.json().catch(() => ({}))) as {
    action?: string; owner?: string; siteId?: string; values?: unknown;
  };
  switch (body.action) {
    case 'skip': {
      const ran = await forceDay(state);
      return NextResponse.json({ ok: true, ran, ...publicState(state) });
    }
    case 'runTask': {
      const jobs = await runTaskNow(state, body.siteId);
      return NextResponse.json({ ok: true, jobs, ...publicState(state) });
    }
    case 'clear': {
      clearWorkspace(state);
      return NextResponse.json({ ok: true, cleared: true, ...publicState(state) });
    }
    case 'setOwner': {
      await setOwner(state, String(body.owner ?? ''));
      return NextResponse.json({ ok: true, ...publicState(state) });
    }
    case 'setValues': {
      if (!body.siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
      const res = setValues(state, body.siteId, body.values);
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
