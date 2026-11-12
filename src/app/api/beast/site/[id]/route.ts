import { NextRequest, NextResponse } from 'next/server';
import { loadState, getSiteHtml, deleteSite } from '@/lib/beast/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const page = req.nextUrl.searchParams.get('page') ?? 'index.html';
  const safe = /^[a-z0-9-]+\.html$/.test(page) ? page : 'index.html';
  const html = getSiteHtml(id, safe);
  if (!html) return NextResponse.json({ error: 'site not built yet' }, { status: 404 });
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const state = loadState();
  const ok = deleteSite(state, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
