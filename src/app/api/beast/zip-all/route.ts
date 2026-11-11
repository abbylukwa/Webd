import { NextResponse } from 'next/server';
import { loadState, zipAll } from '@/lib/beast/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = loadState();
  const buf = await zipAll(state);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="beast-workspace-day-${state.day}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
