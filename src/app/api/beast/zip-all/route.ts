import { NextResponse } from 'next/server';
import { loadState, zipAll } from '@/lib/beast/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = loadState();
  const buf = await zipAll(state);
  if (!buf) {
    // the honest refusal: one archive of every site would exceed the
    // instance's memory — per-site ZIPs remain fully available
    return NextResponse.json({
      error: 'workspace too heavy for a single archive on this instance — download each site with its own ZIP button',
      sites: state.sites.length,
    }, { status: 413 });
  }
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="beast-workspace-cycle-${state.cycle}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
