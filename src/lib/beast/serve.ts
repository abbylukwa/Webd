// Serving layer for site files over HTTP.
//
// The stored files (and the downloaded ZIP) use PURE RELATIVE links so the
// site stays portable on disk and on any static host. When a file is viewed
// through the API instead, relative URLs like "about.html" or
// "assets/x.jpg" would resolve against /api/beast/site/ (dropping the site
// id) and 404. So HTML served here gets <base href="/api/beast/site/<id>/">
// injected at response time only — the disk copy is never touched.
//
// This module must stay free of next/server imports: the bun self-test
// sandbox imports engine.ts (which touches this chain) outside Next.

import { getSiteFile } from './engine';

export const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8', json: 'application/json; charset=utf-8', txt: 'text/plain; charset=utf-8',
  md: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8', svg: 'image/svg+xml',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', ico: 'image/x-icon', gif: 'image/gif',
};

export interface SiteFileResponse {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
}

export function siteFileResponse(id: string, relRaw: string): SiteFileResponse {
  const notFound: SiteFileResponse = {
    status: 404,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: new TextEncoder().encode(JSON.stringify({ error: 'site not built yet — the ledger still has build tasks queued' })),
  };
  const rel = relRaw.replace(/^\/+/, '') || 'index.html';
  const file = getSiteFile(id, rel);
  if (!file) return notFound;
  const ext = rel.split('.').pop()?.toLowerCase() ?? 'txt';
  const type = MIME[ext] ?? 'application/octet-stream';
  const headers: Record<string, string> = { 'Content-Type': type, 'Cache-Control': 'no-store' };
  if (type.startsWith('image/')) headers['Cache-Control'] = 'public, max-age=3600';
  let body = new Uint8Array(file);
  if (type.startsWith('text/html')) {
    const base = `<base href="/api/beast/site/${id}/"/>`;
    let html = new TextDecoder().decode(file);
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, `<head$1>${base}`);
    else html = `${base}\n${html}`;
    body = new TextEncoder().encode(html);
  }
  return { status: 200, headers, body };
}
