import { NextRequest, NextResponse } from 'next/server';
import { loadState, zipSite } from '@/lib/beast/engine';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const state = loadState();
  if (!state.sites.some((s) => s.id === id)) {
    return NextResponse.json({ error: 'site not found' }, { status: 404 });
  }
  const buf = await zipSite(state, id);
  if (!buf) return NextResponse.json({ error: 'site not built yet — the ledger still has build tasks queued' }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${id}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
