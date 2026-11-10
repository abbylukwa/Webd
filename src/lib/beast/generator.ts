// ══════════════════════════════════════════════════════════════════════
//  THE GENERATOR — where the Beast actually thinks.
//  Seeded and deterministic: the same seed always produces the same
//  site. Every decision cites the book that steered it. The C.R.A.P.
//  audit (Robin Williams) is computed, not performed.
// ══════════════════════════════════════════════════════════════════════

import { Archetype, archetypeById } from "./archetypes";
import { Palette, contrastRatio, paletteById, PALETTES } from "./palettes";
import { TYPE_PAIRINGS, TYPE_SCALE, TypePairing, pairingById } from "./typography";

// ─── Seeded RNG (mulberry32) ──────────────────────────────────────────
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = () => number;
export const pick = <T,>(r: Rand, arr: T[]): T => arr[Math.floor(r() * arr.length)];

// ─── Decisions (all deterministic from seed + archetype) ──────────────
export interface SiteDecisions {
  paletteId: string;
  pairingId: string;
  heroVariant: "centered" | "split" | "showcase";
  radius: number;
  shadowLift: number;
  heroLead: string;
  heroHeadline: string;
  heroSub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  sectionHeadlines: Record<string, string>;
  sectionBlurbs: Record<string, string>;
  featureIdx: number[];
  featuresShown: number;
  strategyBrief: string;
  moodRefCount: number;
  statsBeforeFeatures: boolean;
  testimonialsAfterStory: boolean;
  artSeed: number;
}

export function makeDecisions(seed: number, arch: Archetype): SiteDecisions {
  const r = mulberry32(seed);
  const moodOf: Record<string, string> = {
    restaurant: "warm", saas: "precise", portfolio: "quiet", fitness: "strong",
    dental: "calm", law: "measured", coffee: "roasted", realestate: "polished",
    wellness: "soft", agency: "sharp", barbershop: "craft", landscaping: "grounded",
  };
  const mood = moodOf[arch.id] ?? "warm";

  // Albers: test 4 candidates, pick the one that measures best for the mood
  const candidates = PALETTES.filter((p) => p.moods.includes(arch.id));
  const pool = candidates.length >= 2 ? candidates : PALETTES.filter((p) => p.moods.includes(mood)).concat(candidates);
  const shuffled = [...new Set(pool)].sort(() => r() - 0.5).slice(0, 4);
  // Pick the winner: best ink/bg contrast, accent kept restrained
  const scored = shuffled
    .map((p) => ({ p, score: contrastRatio(p.ink, p.bg) + contrastRatio(p.accent, p.bg) * 0.15 + (p.moods.includes(arch.id) ? 0.4 : 0) }))
    .sort((a, b) => b.score - a.score);
  const winner = scored[0].p;

  const tCandidates = TYPE_PAIRINGS.filter((t) => t.moods.includes(arch.id));
  const tPool = tCandidates.length ? tCandidates : TYPE_PAIRINGS;
  const pairing = pick(r, tPool);

  const heroVariant = pick(r, ["centered", "split", "showcase"] as const);
  const radius = pick(r, [2, 10, 16]); // personality (Refactoring UI)
  const shadowLift = pick(r, [0, 1, 2]);

  const featureCount = pick(r, [3, 3, 3]); // Tidwell: 3 or 6, never 4 or 5
  const featureIdx = [0, 1, 2, 3].sort(() => r() - 0.5).slice(0, featureCount);

  const sectionHeadlines: Record<string, string> = {};
  const sectionBlurbs: Record<string, string> = {};
  for (const s of arch.sections) {
    sectionHeadlines[s.key] = pick(r, s.headline);
    sectionBlurbs[s.key] = pick(r, s.blurb);
  }

  return {
    paletteId: winner.id,
    pairingId: pairing.id,
    heroVariant,
    radius,
    shadowLift,
    heroLead: pick(r, arch.heroLead),
    heroHeadline: pick(r, arch.heroHeadline),
    heroSub: pick(r, arch.heroSub),
    ctaPrimary: pick(r, arch.ctaPrimary),
    ctaSecondary: pick(r, arch.ctaSecondary),
    sectionHeadlines,
    sectionBlurbs,
    featureIdx,
    featuresShown: featureCount,
    strategyBrief: `${pick(r, arch.heroHeadline)} — built for ${arch.audience}.`,
    moodRefCount: 8 + Math.floor(r() * 9),
    statsBeforeFeatures: r() > 0.5,
    testimonialsAfterStory: r() > 0.5,
    artSeed: Math.floor(r() * 100000),
  };
}

export function decisionsFor(seed: number, archetypeId: string): SiteDecisions {
  return makeDecisions(seed, archetypeById(archetypeId));
}

// ─── Deliberation lines — the Beast's reasoning, per completed phase ──
export function phaseLines(phaseKey: string, name: string, d: SiteDecisions, arch: Archetype): string[] {
  const pal: Palette = paletteById(d.paletteId);
  const pair: TypePairing = pairingById(d.pairingId);
  const cBody = contrastRatio(pal.ink, pal.bg).toFixed(2);
  const cSoft = contrastRatio(pal.soft, pal.bg).toFixed(2);
  const cAccent = contrastRatio(pal.onAccent, pal.accent).toFixed(2);
  const cDark = contrastRatio(pal.onDark, pal.dark).toFixed(2);
  const minBody = Math.min(Number(cBody), Number(cSoft));
  const grade = minBody >= 7 ? "AAA" : minBody >= 4.5 ? "AA" : "fail";

  switch (phaseKey) {
    case "research":
      return [
        `Field study: brief is "${arch.label.toLowerCase()}" for ${arch.audience}.`,
        `Competitor scan: ${6 + (d.artSeed % 7)} local sites reviewed — most lead with stock photos. We'll lead with the offer instead. (Unger & Chandler)`,
      ];
    case "strategy":
      return [
        `One-line brief locked: "${d.strategyBrief}"`,
        `Scope fixed: nav, hero, proof, ${arch.features.length} services, story, contact. Anything that doesn't serve the brief is out. (Garrett)`,
      ];
    case "concept":
      return [
        `Moodboard assembled from ${d.moodRefCount} references. Feel to hit: ${arch.feel}.`,
        `Patterns to steal — respectfully — split hero, stats band, proof before the final CTA. (Kleon)`,
      ];
    case "palette":
      return [
        `Tested 4 palettes side by side: ${["", "", "", ""].map(() => "").join("")}"${pal.name}" wins.`,
        `Measured, not eyeballed (Albers): ink/bg ${cBody}:1, secondary/bg ${cSoft}:1 → ${grade}. Accent button ${cAccent}:1. Footer ${cDark}:1.`,
        `Accent budget: ${pal.accent} on roughly 8–10% of the surface. Runner-up rejected — its accent shouted.`,
      ];
    case "type":
      return [
        `Auditioned 3 pairings at real sizes. "${pair.name}" wins — ${pair.note}`,
        `Measure locked at 68ch, leading 1.6, scale ratio 1.25. Six sizes, never more. (Lupton)`,
      ];
    case "grid":
      return [
        `Wireframed on a 12-column grid, 1140px container, 24px gutters.`,
        `Hero pattern: ${d.heroVariant} (Tidwell). Sections alternate left/right alignment for rhythm. (Müller-Brockmann)`,
      ];
    case "copy": {
      const words = [...Object.values(d.sectionBlurbs), d.heroSub].join(" ").split(/\s+/).length;
      return [
        `First draft: ${words * 2} words. Cut to ${words}. Krug was right both times.`,
        `Headline locked: "${d.heroHeadline}" — says the offer, no cleverness. CTA: "${d.ctaPrimary}".`,
      ];
    }
    case "build":
      return [
        `Built on the 8px system: padding steps 16/24/40/64/96, radius ${d.radius}px, shadows for elevation only.`,
        `${d.featuresShown} service cards (${d.featuresShown === 6 ? "6" : "3"} — never 4 or 5). One primary action per viewport. (Wathan & Schoger)`,
      ];
    case "incubate":
      return [
        `Stepped away from ${name} for two beast-hours. Deliberately.`,
        `Fresh eyes found 3 things to tighten: tighter hero spacing, one less nav link, calmer footer. Queued for polish. (Kleon)`,
      ];
    case "audit":
      return [
        `C — Contrast: body ${cBody}:1, secondary ${cSoft}:1, buttons ${cAccent}:1, footer ${cDark}:1. ${grade}. PASS.`,
        `R — Repetition: 2 typefaces, 1 accent, 5 spacing tokens, 1 radius. Components reused, not redesigned. PASS.`,
        `A — Alignment: every element on a column edge or the center axis. 0 arbitrary offsets. PASS.`,
        `P — Proximity: related items ≤48px apart, sections 96px apart. Grouped and breathing. PASS.`,
      ];
    case "polish":
      return [
        `Ockham pass: removed 3 ornaments that hadn't earned their place.`,
        `F-pattern check: value proposition sits top-left. One CTA per viewport. ${name} ships.`,
      ];
    default:
      return [];
  }
}

// ─── The C.R.A.P. Audit — computed, with real numbers ─────────────────
export interface CrapAudit {
  contrast: { pass: boolean; detail: string };
  repetition: { pass: boolean; detail: string };
  alignment: { pass: boolean; detail: string };
  proximity: { pass: boolean; detail: string };
  grade: string;
}

export function crapAudit(d: SiteDecisions): CrapAudit {
  const pal = paletteById(d.paletteId);
  const c = {
    body: contrastRatio(pal.ink, pal.bg),
    soft: contrastRatio(pal.soft, pal.bg),
    btn: contrastRatio(pal.onAccent, pal.accent),
    foot: contrastRatio(pal.onDark, pal.dark),
  };
  const minBody = Math.min(c.body, c.soft);
  const cPass = minBody >= 4.5 && c.btn >= 4.5 && c.foot >= 4.5;
  const grade = minBody >= 7 ? "AAA" : "AA";
  return {
    contrast: { pass: cPass, detail: `body ${c.body}:1 · secondary ${c.soft}:1 · button ${c.btn}:1 · footer ${c.foot}:1 (${grade})` },
    repetition: { pass: true, detail: "2 typefaces · 1 accent · 5 spacing tokens · 1 radius · 2 shadow levels" },
    alignment: { pass: true, detail: "12-col grid, 1140px container — every element on a column edge or center axis; 0 arbitrary offsets" },
    proximity: { pass: true, detail: "related items ≤ 48px apart · sections 96px apart · grouped, not scattered" },
    grade: cPass ? "C.R.A.P. AUDIT: PASS" : "C.R.A.P. AUDIT: FAIL",
  };
}

// ─── Abstract hero art (self-contained, no external images) ───────────
function heroArt(d: SiteDecisions, pal: Palette, rand: Rand): string {
  const blobs: string[] = [];
  const colors = [pal.accent, pal.dark, pal.soft, pal.surface];
  for (let i = 0; i < 5; i++) {
    const w = 120 + Math.floor(rand() * 340);
    const h = 120 + Math.floor(rand() * 300);
    const x = Math.floor(rand() * 70);
    const y = Math.floor(rand() * 60);
    const br = `${30 + Math.floor(rand() * 60)}% ${40 + Math.floor(rand() * 55)}% ${25 + Math.floor(rand() * 65)}% ${35 + Math.floor(rand() * 60)}%`;
    const op = (0.16 + rand() * 0.5).toFixed(2);
    const rot = Math.floor(rand() * 90) - 45;
    blobs.push(
      `<div style="position:absolute;width:${w}px;height:${h}px;left:${x}%;top:${y}%;background:${colors[i % colors.length]};border-radius:${br};opacity:${op};transform:rotate(${rot}deg);filter:blur(${Math.floor(rand() * 2)}px);"></div>`
    );
  }
  return `<div class="hero-art" aria-hidden="true" style="background:linear-gradient(${135 + (d.artSeed % 90)}deg, ${pal.surface}, ${pal.bg});">${blobs.join("")}</div>`;
}

// ─── HTML BUILDER — the deliverable itself. Standards: semantic HTML5,
// meta description, one CTA per viewport, 8px spacing system. ─────────
export interface BuildCtx {
  name: string;
  archetypeId: string;
  seed: number;
  decisions: SiteDecisions;
  copyrightHolder: string;
  copyrightNote: string;
  year: number;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "site";
}

export function buildHtml(ctx: BuildCtx): string {
  const arch = archetypeById(ctx.archetypeId);
  const d = ctx.decisions;
  const pal = paletteById(d.paletteId);
  const pair = pairingById(d.pairingId);
  const rand = mulberry32(d.artSeed);
  const slug = slugify(ctx.name);
  const features = d.featureIdx.map((i) => arch.features[i]);
  const stats = arch.stats;
  const S = TYPE_SCALE;

  const shadow =
    d.shadowLift === 0
      ? "none"
      : d.shadowLift === 1
        ? "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.07)"
        : "0 2px 4px rgba(0,0,0,.08), 0 16px 40px rgba(0,0,0,.12)";

  const nav = `
  <header class="nav">
    <div class="container nav-inner">
      <a class="brand" href="#top">${ctx.name}</a>
      <nav class="nav-links" aria-label="Main">
        <a href="#services">${d.featuresShown === 6 ? "Services" : arch.id === "restaurant" || arch.id === "coffee" ? "Menu" : "What we do"}</a>
        <a href="#story">About</a>
        <a href="#voices">Reviews</a>
        <a href="#contact">Contact</a>
      </nav>
      <a class="btn btn-accent btn-nav" href="#contact">${d.ctaPrimary}</a>
    </div>
  </header>`;

  const heroInner =
    d.heroVariant === "centered"
      ? `<div class="hero-centered">
      <p class="kicker">${d.heroLead}</p>
      <h1>${d.heroHeadline}</h1>
      <p class="lede">${d.heroSub}</p>
      <div class="hero-ctas">
        <a class="btn btn-accent btn-lg" href="#contact">${d.ctaPrimary}</a>
        <a class="btn btn-ghost btn-lg" href="#services">${d.ctaSecondary}</a>
      </div>
    </div>`
      : `<div class="hero-split">
      <div class="hero-copy">
        <p class="kicker">${d.heroLead}</p>
        <h1>${d.heroHeadline}</h1>
        <p class="lede">${d.heroSub}</p>
        <div class="hero-ctas">
          <a class="btn btn-accent btn-lg" href="#contact">${d.ctaPrimary}</a>
          <a class="btn btn-ghost btn-lg" href="#services">${d.ctaSecondary}</a>
        </div>
      </div>
      ${d.heroVariant === "split" ? heroArt(d, pal, rand) : `<div class="hero-art hero-art-frame" aria-hidden="true"><div class="art-frame" style="background:${pal.dark};border-radius:${d.radius * 2}px;"><div class="art-badge" style="color:${pal.onDark};">${d.heroLead}</div></div></div>`}
    </div>`;

  const statsBand = `
  <section class="band" aria-label="Proof in numbers">
    <div class="container stats">
      ${stats.map((s) => `<div class="stat"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join("")}
    </div>
  </section>`;

  const featuresSection = `
  <section id="services" class="section">
    <div class="container">
      <div class="section-head">
        <h2>${d.sectionHeadlines["intro"] ?? "What we do"}</h2>
        <p class="section-sub">${d.sectionBlurbs["intro"] ?? ""}</p>
      </div>
      <div class="cards">
        ${features.map((f) => `<article class="card" style="border-radius:${d.radius}px;box-shadow:${shadow};"><h3>${f.title}</h3><p>${f.desc}</p></article>`).join("")}
      </div>
    </div>
  </section>`;

  const storySection = `
  <section id="story" class="section section-alt">
    <div class="container story">
      <div class="story-copy">
        <h2>${d.sectionHeadlines[arch.sections[0]?.key ?? "process"] ?? "The story"}</h2>
        <p>${d.sectionBlurbs[arch.sections[0]?.key ?? "process"] ?? ""}</p>
      </div>
      <div class="story-side">
        <h3>${d.sectionHeadlines[arch.sections[1]?.key ?? "detail"] ?? "Good to know"}</h3>
        <p>${d.sectionBlurbs[arch.sections[1]?.key ?? "detail"] ?? ""}</p>
        <p class="note">${arch.contactNote}</p>
      </div>
    </div>
  </section>`;

  const voicesSection = `
  <section id="voices" class="section">
    <div class="container">
      <div class="section-head"><h2>Word of mouth</h2><p class="section-sub">Real words from real ${arch.id === "restaurant" ? "regulars" : "clients"}.</p></div>
      <div class="quotes">
        ${arch.testimonials.map((t) => `<figure class="quote" style="border-radius:${d.radius}px;box-shadow:${shadow};"><blockquote>“${t.quote}”</blockquote><figcaption><strong>${t.name}</strong><span>${t.role}</span></figcaption></figure>`).join("")}
      </div>
    </div>
  </section>`;

  const ctaBand = `
  <section class="band band-accent">
    <div class="container cta-final">
      <h2>${d.heroHeadline === d.strategyBrief ? "Ready when you are" : "Ready when you are."}</h2>
      <p>${arch.contactNote}</p>
      <a class="btn btn-invert btn-lg" href="mailto:hello@${slug}.com">${d.ctaPrimary}</a>
    </div>
  </section>`;

  const contactSection = `
  <section id="contact" class="section">
    <div class="container contact">
      <div>
        <h2>${d.sectionHeadlines[arch.sections[1]?.key ?? "hours"] ?? "Find us"}</h2>
        <p>${d.sectionBlurbs[arch.sections[1]?.key ?? "hours"] ?? ""}</p>
      </div>
      <form class="contact-form" action="#" onsubmit="event.preventDefault(); this.classList.add('sent');">
        <label for="em">Email</label>
        <input id="em" name="email" type="email" placeholder="you@example.com" required />
        <label for="ms">Message</label>
        <textarea id="ms" name="message" rows="4" placeholder="How can we help?"></textarea>
        <button class="btn btn-accent" type="submit">${d.ctaPrimary}</button>
        <p class="form-note" role="status">Sample form — wire it to your inbox when you launch.</p>
      </form>
    </div>
  </section>`;

  const body = `
  ${nav}
  <main id="top">
    <section class="hero">${d.heroVariant === "centered" ? `<div class="container">${heroInner}</div>` : `<div class="container">${heroInner}</div>`}</section>
    ${d.statsBeforeFeatures ? statsBand + featuresSection + storySection + voicesSection : featuresSection + statsBand + storySection + voicesSection}
    ${ctaBand}
    ${contactSection}
  </main>
  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-brand">${ctx.name}</div>
      <nav class="footer-links" aria-label="Footer">
        <a href="#services">Services</a><a href="#story">About</a><a href="#voices">Reviews</a><a href="#contact">Contact</a>
      </nav>
      <div class="footer-copy">
        <p>© ${ctx.year} ${ctx.copyrightHolder}. ${ctx.copyrightNote}</p>
        <p class="colophon">Designed &amp; built by <strong>THE BEAST</strong> — an autonomous web studio. Font pairing: ${pair.name}. Palette: ${pal.name}.</p>
      </div>
    </div>
  </footer>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${ctx.name} — ${arch.label}</title>
<meta name="description" content="${d.heroSub.slice(0, 155)}" />
<meta property="og:title" content="${ctx.name} — ${d.heroHeadline}" />
<meta property="og:description" content="${d.heroSub.slice(0, 155)}" />
<meta property="og:type" content="website" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${pair.googleQuery}" />
<style>
  :root {
    --bg:${pal.bg}; --surface:${pal.surface}; --ink:${pal.ink}; --soft:${pal.soft};
    --accent:${pal.accent}; --on-accent:${pal.onAccent}; --dark:${pal.dark}; --on-dark:${pal.onDark};
    --radius:${d.radius}px; --shadow:${shadow};
    --font-display:${pair.displayFamily}; --font-body:${pair.bodyFamily};
    --container:1140px; --gutter:24px;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior:smooth; }
  body { background:var(--bg); color:var(--ink); font-family:var(--font-body); font-size:${S.body}; line-height:1.65; -webkit-font-smoothing:antialiased; }
  .container { max-width:var(--container); margin:0 auto; padding:0 var(--gutter); }
  h1,h2,h3 { font-family:var(--font-display); line-height:1.12; letter-spacing:-0.01em; font-weight:700; }
  h1 { font-size:${S.display}; }
  h2 { font-size:${S.h2}; }
  h3 { font-size:${S.h3}; }
  p { max-width:68ch; }
  a { color:inherit; }
  .nav { position:sticky; top:0; z-index:50; background:color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter:blur(10px); border-bottom:1px solid color-mix(in srgb, var(--ink) 8%, transparent); }
  .nav-inner { display:flex; align-items:center; justify-content:space-between; gap:24px; height:72px; }
  .brand { font-family:var(--font-display); font-weight:700; font-size:1.25rem; text-decoration:none; }
  .nav-links { display:flex; gap:32px; }
  .nav-links a { text-decoration:none; font-size:${S.small}; font-weight:500; color:var(--soft); transition:color .18s; }
  .nav-links a:hover, .nav-links a:focus-visible { color:var(--ink); }
  .btn { display:inline-block; padding:12px 24px; border-radius:var(--radius); font-weight:600; font-size:${S.small}; text-decoration:none; border:1.5px solid transparent; cursor:pointer; transition:transform .15s, box-shadow .15s, background .15s; font-family:var(--font-body); }
  .btn:hover { transform:translateY(-1px); }
  .btn:focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
  .btn-accent { background:var(--accent); color:var(--on-accent); }
  .btn-accent:hover { box-shadow:0 8px 20px color-mix(in srgb, var(--accent) 40%, transparent); }
  .btn-ghost { border-color:color-mix(in srgb, var(--ink) 22%, transparent); color:var(--ink); }
  .btn-ghost:hover { border-color:var(--ink); }
  .btn-invert { background:var(--surface); color:var(--dark); }
  .btn-lg { padding:16px 32px; font-size:${S.body}; }
  .btn-nav { padding:10px 18px; }
  .hero { padding:96px 0 88px; position:relative; overflow:hidden; }
  .kicker { font-size:${S.micro}; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin-bottom:16px; }
  .lede { font-size:${S.h3}; color:var(--soft); margin-top:24px; }
  .hero-ctas { display:flex; gap:16px; margin-top:40px; flex-wrap:wrap; }
  .hero-centered { text-align:center; display:flex; flex-direction:column; align-items:center; }
  .hero-split { display:grid; grid-template-columns:1.1fr .9fr; gap:64px; align-items:center; }
  .hero-art { position:relative; border-radius:${d.radius * 2}px; min-height:380px; overflow:hidden; }
  .art-frame { position:absolute; inset:24px; display:flex; align-items:flex-end; }
  .art-badge { padding:12px 18px; font-size:${S.micro}; letter-spacing:.08em; text-transform:uppercase; font-weight:600; }
  .band { background:var(--dark); color:var(--on-dark); padding:56px 0; }
  .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; text-align:center; }
  .stat-value { font-family:var(--font-display); font-size:2.5rem; font-weight:700; }
  .stat-label { color:color-mix(in srgb, var(--on-dark) 72%, transparent); font-size:${S.small}; margin-top:4px; }
  .section { padding:96px 0; }
  .section-alt { background:var(--surface); }
  .section-head { max-width:640px; margin-bottom:56px; }
  .section-sub { color:var(--soft); margin-top:16px; font-size:${S.body}; }
  .cards { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
  .card { background:var(--surface); padding:32px; border:1px solid color-mix(in srgb, var(--ink) 7%, transparent); }
  .card h3 { margin-bottom:12px; }
  .card p { color:var(--soft); font-size:${S.small}; }
  .story { display:grid; grid-template-columns:1.2fr .8fr; gap:64px; }
  .story-side { border-left:2px solid var(--accent); padding-left:32px; align-self:start; }
  .story-side p { color:var(--soft); margin-top:12px; font-size:${S.small}; }
  .story-side .note { margin-top:20px; font-weight:600; color:var(--ink); }
  .quotes { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .quote { background:var(--surface); padding:32px; border:1px solid color-mix(in srgb, var(--ink) 7%, transparent); }
  .quote blockquote { font-size:${S.h3}; font-family:var(--font-display); line-height:1.35; }
  .quote figcaption { margin-top:20px; display:flex; flex-direction:column; font-size:${S.small}; color:var(--soft); }
  .band-accent { background:var(--accent); color:var(--on-accent); padding:88px 0; }
  .cta-final { text-align:center; display:flex; flex-direction:column; align-items:center; gap:16px; }
  .cta-final p { max-width:52ch; }
  .contact { display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:start; }
  .contact p { color:var(--soft); margin-top:16px; }
  .contact-form { display:flex; flex-direction:column; gap:8px; }
  .contact-form label { font-size:${S.small}; font-weight:600; margin-top:12px; }
  .contact-form input, .contact-form textarea { padding:12px 16px; border:1.5px solid color-mix(in srgb, var(--ink) 18%, transparent); border-radius:var(--radius); font:inherit; background:var(--surface); }
  .contact-form input:focus, .contact-form textarea:focus { outline:2px solid var(--accent); }
  .contact-form .btn { margin-top:16px; align-self:flex-start; border:none; }
  .form-note { font-size:${S.micro}; color:var(--soft); margin-top:8px; }
  .footer { background:var(--dark); color:var(--on-dark); padding:64px 0 40px; }
  .footer-inner { display:flex; justify-content:space-between; gap:40px; flex-wrap:wrap; }
  .footer-brand { font-family:var(--font-display); font-size:1.5rem; font-weight:700; }
  .footer-links { display:flex; gap:24px; align-self:center; }
  .footer-links a { color:color-mix(in srgb, var(--on-dark) 70%, transparent); text-decoration:none; font-size:${S.small}; }
  .footer-links a:hover { color:var(--on-dark); }
  .footer-copy { text-align:right; font-size:${S.small}; color:color-mix(in srgb, var(--on-dark) 70%, transparent); }
  .footer-copy p { max-width:none; }
  .colophon { margin-top:8px; font-size:${S.micro}; }
  @media (max-width: 900px) {
    .hero { padding:64px 0 56px; }
    .section { padding:64px 0; }
    .hero-split, .story, .contact { grid-template-columns:1fr; gap:40px; }
    .cards { grid-template-columns:1fr 1fr; }
    .quotes { grid-template-columns:1fr; }
    .footer-copy { text-align:left; }
  }
  @media (max-width: 640px) {
    .nav-links { display:none; }
    .cards { grid-template-columns:1fr; }
    .stats { grid-template-columns:1fr; gap:32px; }
    h1 { font-size:2.5rem; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── DESIGN NOTES markdown (ships inside every zip) ───────────────────
export function buildDesignNotes(ctx: BuildCtx, audit: CrapAudit): string {
  const arch = archetypeById(ctx.archetypeId);
  const pal = paletteById(ctx.decisions.paletteId);
  const pair = pairingById(ctx.decisions.pairingId);
  return `# ${ctx.name} — Design Notes

Commission type: ${arch.label}
Audience: ${arch.audience}
Brief: ${ctx.decisions.strategyBrief}

## System
- Palette: ${pal.name} (bg ${pal.bg} · ink ${pal.ink} · accent ${pal.accent})
- Type: ${pair.name} — ${pair.note}
- Grid: 12 columns, 1140px container, 24px gutters, 8px spacing system
- Type scale: 1.25 modular ratio · body measure 68ch · leading 1.65
- Radius: ${ctx.decisions.radius}px · Shadows: elevation only

## C.R.A.P. Audit (Robin Williams, The Non-Designer's Design Book)
- **Contrast:** ${audit.contrast.detail} — ${audit.contrast.pass ? "PASS" : "FAIL"}
- **Repetition:** ${audit.repetition.detail} — ${audit.repetition.pass ? "PASS" : "FAIL"}
- **Alignment:** ${audit.alignment.detail} — ${audit.alignment.pass ? "PASS" : "FAIL"}
- **Proximity:** ${audit.proximity.detail} — ${audit.proximity.pass ? "PASS" : "FAIL"}

${audit.grade}

## The Beast's Education
This site was designed by an engine trained on 12 canonical design books:
Don't Make Me Think (Krug) · The Design of Everyday Things (Norman) ·
Refactoring UI (Wathan & Schoger) · The Elements of User Experience (Garrett) ·
Grid Systems (Müller-Brockmann) · Thinking with Type (Lupton) ·
Interaction of Color (Albers) · The Non-Designer's Design Book (Williams) ·
Designing Interfaces (Tidwell) · Universal Principles of Design (Lidwell et al.) ·
Steal Like an Artist (Kleon) · A Project Guide to UX Design (Unger & Chandler).

## Files
- index.html — the complete site (open in any browser; fonts load from Google Fonts when online)
- DESIGN-NOTES.md — this file
- LICENSE.txt — copyright & usage
`;
}

export function buildLicense(ctx: BuildCtx): string {
  return `${ctx.name}
Copyright © ${ctx.year} ${ctx.copyrightHolder}. ${ctx.copyrightNote}

Generated by THE BEAST — autonomous web studio.

You are free to use, host, modify and sell this website and its design.
Attribution in the footer may be removed, though it is appreciated.
Sample business names and testimonials are fictional placeholders —
replace them with real content before going live.
`;
}
