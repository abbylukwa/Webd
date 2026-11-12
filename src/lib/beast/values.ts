// Beast Values Layer — every human-facing fact of a site in ONE editable object.
// The owner edits once; every page, JSON-LD block, sitemap and ZIP re-renders.
// Caps are law: 12 phone numbers, 30 products, 8 social platforms.

export const MAX_PHONES = 12;
export const MAX_PRODUCTS = 30;
export const MAX_PAGES = 9;

export type SocialPlatform =
  | 'instagram' | 'facebook' | 'x' | 'tiktok' | 'linkedin' | 'youtube' | 'pinterest' | 'whatsapp';

export const SOCIAL_PLATFORMS: { key: SocialPlatform; label: string; url: (h: string) => string }[] = [
  { key: 'instagram', label: 'Instagram', url: (h) => `https://instagram.com/${h}` },
  { key: 'facebook', label: 'Facebook', url: (h) => `https://facebook.com/${h}` },
  { key: 'x', label: 'X (Twitter)', url: (h) => `https://x.com/${h}` },
  { key: 'tiktok', label: 'TikTok', url: (h) => `https://tiktok.com/@${h}` },
  { key: 'linkedin', label: 'LinkedIn', url: (h) => `https://linkedin.com/company/${h}` },
  { key: 'youtube', label: 'YouTube', url: (h) => `https://youtube.com/@${h}` },
  { key: 'pinterest', label: 'Pinterest', url: (h) => `https://pinterest.com/${h}` },
  { key: 'whatsapp', label: 'WhatsApp', url: (h) => `https://wa.me/${h.replace(/[^\d]/g, '')}` },
];

export type Product = { name: string; desc: string; price: number; tag?: string };
export type PhoneLine = { label: string; number: string };
export type SocialLink = { platform: SocialPlatform; handle: string; url: string };

export type SiteValues = {
  brand: string;
  tagline: string;
  phones: PhoneLine[];        // ≤ MAX_PHONES
  emails: string[];
  socials: SocialLink[];      // the modern roster
  hoursDisplay: string[];
  address: string;
  mapEmbed: string;           // OpenStreetMap iframe src (free, no key)
  products: Product[];        // ≤ MAX_PRODUCTS
  domain: string;             // one placeholder the buyer swaps
};

export function socialUrl(platform: SocialPlatform, handle: string): string {
  const found = SOCIAL_PLATFORMS.find((s) => s.key === platform);
  return found ? found.url(handle) : '#';
}

/* ---------- seeded defaults (deterministic from seed) ---------- */
type RngLike = { int: (a: number, b: number) => number; float: (a: number, b: number) => number; pick: <T>(a: T[]) => T };

const PHONE_DEPARTMENTS = [
  'Front desk', 'Bookings', 'Wholesale', 'Events', 'Press', 'Workshops',
  'Delivery', 'Accounts', 'Memberships', 'Partnerships', 'Studio line', 'Owner',
];

const VARIANTS = ['classic', 'deluxe', 'petite', 'grand', 'signature', 'limited', 'house', 'seasonal'];
const TAGS = ['house favourite', 'seasonal', 'limited run', 'new', 'most requested', 'made to order'];

function basePhone(rng: RngLike): string {
  return `+1 (${rng.int(200, 989)}) ${rng.int(200, 989)}-${rng.int(1000, 9999)}`;
}

export function defaultValues(
  seed: string,
  brand: string,
  nicheLabel: string,
  city: string,
  place: string,
  menuTitle: string,
  priceBase: number,
  services: string[],
  rng: RngLike
): SiteValues {
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const phoneCount = rng.int(4, MAX_PHONES);
  const phones: PhoneLine[] = Array.from({ length: phoneCount }, (_, i) => ({
    label: PHONE_DEPARTMENTS[i % PHONE_DEPARTMENTS.length],
    number: basePhone(rng),
  }));

  const productCount = Math.min(MAX_PRODUCTS, rng.int(12, 30));
  const products: Product[] = [];
  let v = 0;
  while (products.length < productCount) {
    const svc = services[products.length % services.length];
    const variant = VARIANTS[v % VARIANTS.length];
    const name = products.length < services.length ? svc : `${svc} · ${variant}`;
    if (products.some((p) => p.name === name)) { v += 1; continue; }
    products.push({
      name,
      desc: rng.pick([
        'Made to order, never boxed ahead.',
        'The one regulars ask for by name.',
        'Small batches, honest materials.',
        'Our take on the standard, done properly.',
        'Available while the season allows.',
      ]),
      price: Math.round(priceBase * rng.float(0.6, 6) * 100) / 100,
      tag: rng.pick(TAGS),
    });
    v += 1;
    if (v > MAX_PRODUCTS * 3) break; // safety
  }

  // plausible coordinates jitter around a seeded point (buyer swaps the exact pin)
  const lat = (rng.int(3800, 5200) / 100);
  const lon = -((rng.int(500, 1200) / 100));
  const bbox = `${lon - 0.012}%2C${lat - 0.008}%2C${lon + 0.012}%2C${lat + 0.008}`;
  const socials: SocialLink[] = SOCIAL_PLATFORMS.map((p) => ({
    platform: p.key,
    handle: p.key === 'whatsapp' ? phones[0].number : `${slug}${p.key === 'x' ? '_studio' : ''}`,
    url: socialUrl(p.key, p.key === 'whatsapp' ? phones[0].number : `${slug}${p.key === 'x' ? '_studio' : ''}`),
  }));

  return {
    brand,
    tagline: `${nicheLabel} in ${city}`,
    phones,
    emails: [`hello@${slug}.site`, `bookings@${slug}.site`],
    socials,
    hoursDisplay: ['Mon–Fri 8–18', 'Sat 9–16', 'Sun closed'],
    address: `${rng.int(2, 148)} ${place}, ${city}`,
    mapEmbed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`,
    products,
    domain: `${slug}.site`,
  };
}

/* ---------- validation (caps are law) ---------- */
export type ValuesIssue = { field: string; problem: string };

export function validateValues(v: SiteValues): { ok: boolean; issues: ValuesIssue[]; clean: SiteValues } {
  const issues: ValuesIssue[] = [];
  const clean: SiteValues = JSON.parse(JSON.stringify(v));
  if (!clean.brand || !clean.brand.trim()) issues.push({ field: 'brand', problem: 'required' });
  clean.phones = (clean.phones ?? []).slice(0, MAX_PHONES);
  if ((v.phones ?? []).length > MAX_PHONES) issues.push({ field: 'phones', problem: `capped at ${MAX_PHONES}` });
  // dedupe FIRST, then cap — the owner always keeps MAX_PRODUCTS unique items
  const seen = new Set<string>();
  const unique = (clean.products ?? []).filter((p) => {
    const n = (p.name ?? '').trim();
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
  clean.products = unique.slice(0, MAX_PRODUCTS);
  if ((v.products ?? []).length > MAX_PRODUCTS) issues.push({ field: 'products', problem: `capped at ${MAX_PRODUCTS}` });
  clean.socials = (clean.socials ?? []).slice(0, SOCIAL_PLATFORMS.length);
  for (const p of clean.products) p.price = Math.max(0, Number(p.price) || 0);
  clean.domain = (clean.domain ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return { ok: issues.length === 0, issues, clean };
}
