import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Lightweight liveness probe for platforms like Render.
// Deliberately reads no state and touches no storage, so it can never fail
// just because the data directory is fresh, empty, or was wiped by a redeploy.
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'beast-web-developer',
    version: '4.0.0',
    engine: 4,
    time: new Date().toISOString(),
  });
}
