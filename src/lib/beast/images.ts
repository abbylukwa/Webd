// Beast Image Service — free, online, licensed imagery with a deterministic core.
// Chain: Openverse API (no key, CC) → Wikimedia Commons → Picsum (seeded) → gradient tiles.
// Law: first accepted fetch WINS and is recorded in site state — re-renders reuse the
// record, so determinism survives; every record ships with full attribution data.

export type ImageRecord = {
  slotId: string;          // e.g. 'hero', 'gallery-2', 'product-7'
  role: string;            // 'hero' | 'gallery' | 'product'
  query: string;
  status: 'live' | 'picsum' | 'gradient';
  file?: string;           // relative path inside the site folder (assets/<slot>.jpg)
  remoteUrl?: string;
  source: string;          // 'openverse' | 'wikimedia' | 'picsum' | 'gradient'
  license?: string;        // e.g. 'cc0', 'by', 'by-sa', 'picsum-license'
  creator?: string;
    sourcePage?: string;     // foreign_landing_url — the human-checkable origin
};

export type ImageSlot = { slotId: string; role: 'hero' | 'gallery' | 'product' | 'service' | 'about' | 'journal' | 'og'; query: string };

const TIMEOUT = 9_000;
const UA = 'BeastWebDeveloper/5.0 (autonomous design studio; image fetcher)';

async function timedFetch(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    const res = await fetch(url, { ...init, signal: controller.signal, headers: { 'user-agent': UA, ...(init?.headers ?? {}) } });
    clearTimeout(timer);
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/* ---------- Openverse: anonymous, CC-licensed, attribution metadata ---------- */
async function openverse(query: string, pickIndex: number): Promise<Partial<ImageRecord> | null> {
  const api = `https://api.openverse.org/v1/images/?format=json&q=${encodeURIComponent(query)}&license=cc0,pdm,by,by-sa&page_size=8`;
  const res = await timedFetch(api);
  if (!res) return null;
  try {
    const data = (await res.json()) as { results?: { url?: string; license?: string; creator?: string; foreign_landing_url?: string; title?: string }[] };
    const hits = (data.results ?? []).filter((r) => r.url);
    if (!hits.length) return null;
    const hit = hits[pickIndex % hits.length];
    if (!hit.url) return null;
    return { remoteUrl: hit.url, source: 'openverse', license: hit.license ?? 'cc', creator: hit.creator ?? 'unknown', sourcePage: hit.foreign_landing_url };
  } catch {
    return null;
  }
}

/* ---------- Wikimedia Commons fallback ---------- */
async function wikimedia(query: string, pickIndex: number): Promise<Partial<ImageRecord> | null> {
  const api =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=` +
    `${encodeURIComponent(query)}&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200`;
  const res = await timedFetch(api);
  if (!res) return null;
  try {
    const data = (await res.json()) as { query?: { pages?: Record<string, { imageinfo?: { url?: string; thumburl?: string; extmetadata?: { LicenseShortName?: { value?: string }; Artist?: { value?: string } } }[] }> } };
    const pages = Object.values(data.query?.pages ?? {});
    const infos = pages.map((p) => p.imageinfo?.[0]).filter(Boolean) as { url?: string; thumburl?: string; extmetadata?: Record<string, { value?: string }> }[];
    if (!infos.length) return null;
    const info = infos[pickIndex % infos.length];
    const url = info.thumburl || info.url;
    if (!url) return null;
    const license = info.extmetadata?.LicenseShortName?.value ?? 'see source';
    const creatorRaw = info.extmetadata?.Artist?.value ?? 'unknown';
    return { remoteUrl: url, source: 'wikimedia', license, creator: creatorRaw.replace(/<[^>]*>/g, '').slice(0, 80), sourcePage: info.url };
  } catch {
    return null;
  }
}

function picsum(seed: string, w = 1200, h = 900): Partial<ImageRecord> {
  return { remoteUrl: `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`, source: 'picsum', license: 'picsum-license', creator: 'picsum.photos', sourcePage: 'https://picsum.photos' };
}

export async function fetchImageBytes(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    const res = await fetch(url, { signal: controller.signal, headers: { 'user-agent': UA } });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 && buf.length < 6_000_000 ? buf : null;
  } catch {
    return null;
  }
}

/** Pick search keywords per niche so images actually fit the business. */
export function nicheImageQueries(nicheLabel: string, nicheKey: string): string[] {
  const KEY: Record<string, string[]> = {
    coffee: ['coffee roasting', 'espresso bar', 'coffee beans'], architecture: ['modern architecture interior', 'architectural model', 'building facade'],
    yoga: ['yoga studio', 'yoga practice', 'meditation room'], ceramics: ['ceramics pottery', 'pottery wheel', 'ceramic bowls'],
    plants: ['plant shop', 'houseplants', 'greenhouse interior'], jazz: ['jazz club stage', 'saxophone', 'live music venue'],
    books: ['bookbinding', 'old books', 'bookbinding workshop'], surf: ['surfing wave', 'surf beach', 'surfboard'],
    bakery: ['sourdough bread', 'bakery interior', 'pastry'], tattoo: ['tattoo studio', 'tattoo artist work', 'tattoo ink'],
    florist: ['florist bouquet', 'flower shop', 'flower arrangement'], agency: ['design studio workspace', 'creative office', 'branding design'],
  };
  const arr = KEY[nicheKey] ?? [nicheLabel, `${nicheLabel} interior`, `${nicheLabel} craft`];
  return arr.length ? arr : [nicheLabel];
}

/**
 * Resolve every slot for a site. existing = the determinism record: slots already
 * resolved are reused verbatim (never re-searched). Unresolvable slots degrade to
 * 'gradient' (the offline floor) — the studio never blocks on the network.
 */
export async function resolveImages(
  seed: string,
  nicheKey: string,
  nicheLabel: string,
  slots: ImageSlot[],
  existing: ImageRecord[],
  saveFile?: (slotId: string, bytes: Buffer) => string | null
): Promise<{ records: ImageRecord[]; newFetches: number }> {
  const queries = nicheImageQueries(nicheLabel, nicheKey);
  const records: ImageRecord[] = [];
  let newFetches = 0;
  let qi = Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  for (const slot of slots) {
    const prior = existing.find((r) => r.slotId === slot.slotId && r.status !== 'gradient');
    if (prior) { records.push(prior); continue; }
    if (process.env.BEAST_IMAGES === '0') {
      records.push({ slotId: slot.slotId, role: slot.role, query: slot.query, status: 'gradient', source: 'gradient' });
      continue;
    }
    const attempt = async (): Promise<Partial<ImageRecord> | null> => {
      qi += 1;
      const ov = await openverse(slot.query || queries[qi % queries.length], qi);
      if (ov) return ov;
      const wm = await wikimedia(slot.query || queries[qi % queries.length], qi);
      if (wm) return wm;
      return null;
    };
    const found = await attempt();
    if (found?.remoteUrl) {
      if (saveFile) {
        const bytes = await fetchImageBytes(found.remoteUrl);
        const rel = bytes ? saveFile(slot.slotId, bytes) : null;
        if (rel) {
          records.push({ slotId: slot.slotId, role: slot.role, query: slot.query, status: 'live', file: rel, ...found } as ImageRecord);
          newFetches += 1;
          continue;
        }
        // bytes failed but the URL is live → hotlink record (still attributed)
        records.push({ slotId: slot.slotId, role: slot.role, query: slot.query, status: 'live', ...found } as ImageRecord);
        newFetches += 1;
        continue;
      }
      records.push({ slotId: slot.slotId, role: slot.role, query: slot.query, status: 'live', ...found } as ImageRecord);
      newFetches += 1;
      continue;
    }
    const ps = picsum(`${seed}-${slot.slotId}`);
    if (saveFile) {
      const bytes = await fetchImageBytes(ps.remoteUrl!);
      const rel = bytes ? saveFile(slot.slotId, bytes) : null;
      if (rel) {
        records.push({ slotId: slot.slotId, role: slot.role, query: slot.query, status: 'picsum', file: rel, source: 'picsum', license: 'picsum-license', creator: 'picsum.photos', remoteUrl: ps.remoteUrl, sourcePage: ps.sourcePage });
        newFetches += 1;
        continue;
      }
    }
    records.push({ slotId: slot.slotId, role: slot.role, query: slot.query, status: 'gradient', source: 'gradient' });
  }
  return { records, newFetches };
}

export function attributionMarkdown(siteBrand: string, records: ImageRecord[]): string {
  const rows = records
    .filter((r) => r.status !== 'gradient')
    .map((r) => `| ${r.slotId} | ${r.source} | ${r.creator ?? '—'} | ${r.license ?? '—'} | ${r.sourcePage ?? r.remoteUrl ?? '—'} |`)
    .join('\n');
  return `# Image attribution — ${siteBrand}

Every image below is openly licensed. This file is the licence paper trail that
ships with the site; keep it with the site forever.

| slot | source | creator | license | source page |
| --- | --- | --- | --- | --- |
${rows || '(no live images — this site uses generated gradient artwork, no third-party media)'}

Gradient tiles are generated artwork (no third-party rights attached).
`;
}
