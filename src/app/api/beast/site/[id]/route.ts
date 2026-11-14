import { NextRequest, NextResponse } from 'next/server';
import { loadState, deleteSite } from '@/lib/beast/engine';
import { siteFileResponse } from '@/lib/beast/serve';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // every file gets a view: pages, product pages, journal posts, assets, data files.
  // ?page=… keeps working for direct fetches; plain /site/<id> serves index.html.
  const raw = req.nextUrl.searchParams.get('page') ?? 'index.html';
  const r = siteFileResponse(id, raw);
  return new NextResponse(new Uint8Array(r.body), { status: r.status, headers: r.headers });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const state = loadState();
  const ok = deleteSite(state, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
