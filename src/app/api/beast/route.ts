import { NextRequest, NextResponse } from 'next/server';
import { loadState, tick, forceDay, clearWorkspace, setOwner, STAGES, DEVICE_CLASSES, CONCURRENCY } from '@/lib/beast/engine';

export const dynamic = 'force-dynamic';

function publicState(state: ReturnType<typeof loadState>) {
  return {
    day: state.day,
    owner: state.owner,
    concurrency: CONCURRENCY,
    stages: STAGES,
    devices: DEVICE_CLASSES,
    sites: state.sites.map((s) => ({
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
    })),
    log: state.log.slice(0, 14),
  };
}

export async function GET() {
  const state = loadState();
  tick(state); // auto catch-up on missed real days
  return NextResponse.json(publicState(state));
}

export async function POST(req: NextRequest) {
  const state = loadState();
  const body = (await req.json().catch(() => ({}))) as { action?: string; owner?: string };
  switch (body.action) {
    case 'skip': {
      const ran = forceDay(state);
      return NextResponse.json({ ok: true, ran, ...publicState(state) });
    }
    case 'clear': {
      clearWorkspace(state);
      return NextResponse.json({ ok: true, cleared: true, ...publicState(state) });
    }
    case 'setOwner': {
      setOwner(state, String(body.owner ?? ''));
      return NextResponse.json({ ok: true, ...publicState(state) });
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
