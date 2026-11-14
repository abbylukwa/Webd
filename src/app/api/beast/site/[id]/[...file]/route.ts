import { NextRequest, NextResponse } from 'next/server';
import { siteFileResponse } from '@/lib/beast/serve';

export const dynamic = 'force-dynamic';

// Catch-all view: /api/beast/site/<id>/<file…> serves every site file by path
// (pages, assets, data files). Exists so RELATIVE links inside a previewed
// page — "about.html", "assets/img-x.jpg" — resolve against the site's own
// path instead of leaking up to /api/beast/site/ (which 404s).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; file: string[] }> }) {
  const { id, file } = await ctx.params;
  const rel = (file ?? []).join('/');
  const r = siteFileResponse(id, rel);
  return new NextResponse(new Uint8Array(r.body), { status: r.status, headers: r.headers });
}
