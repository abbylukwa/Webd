import { NextRequest, NextResponse } from 'next/server';
import { loadState, getSiteFile, deleteSite } from '@/lib/beast/engine';

export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8', json: 'application/json; charset=utf-8', txt: 'text/plain; charset=utf-8',
  md: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8', svg: 'image/svg+xml',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', ico: 'image/x-icon', gif: 'image/gif',
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // every file gets a view: pages, product pages, journal posts, assets, data files
  const raw = req.nextUrl.searchParams.get('page') ?? 'index.html';
  const rel = raw.replace(/^\/+/, '');
  const file = getSiteFile(id, rel);
  if (!file) return NextResponse.json({ error: 'site not built yet — the ledger still has build tasks queued' }, { status: 404 });
  const ext = rel.split('.').pop()?.toLowerCase() ?? 'txt';
  const type = MIME[ext] ?? 'application/octet-stream';
  const headers: Record<string, string> = { 'Content-Type': type, 'Cache-Control': 'no-store' };
  if (type.startsWith('image/')) headers['Cache-Control'] = 'public, max-age=3600';
  return new NextResponse(new Uint8Array(file), { headers });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const state = loadState();
  const ok = deleteSite(state, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
