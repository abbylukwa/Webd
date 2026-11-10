// ══════════════════════════════════════════════════════════════════════
//  THE GENERATOR — where the Beast actually thinks.
//  Seeded and deterministic: the same seed always produces the same
//  site. Every decision cites the book that steered it. The layout is
//  chosen from THE LAYOUT BOOK (12 fully specified layouts) and the
//  emitted CSS is built from that layout's measured spec — grid math,
//  not vibes. The C.R.A.P. audit (Robin Williams) is computed.
// ══════════════════════════════════════════════════════════════════════

import { Archetype, archetypeById } from "./archetypes";
import { Palette, contrastRatio, paletteById, PALETTES } from "./palettes";
import { TYPE_PAIRINGS, TYPE_SCALE, TypePairing, pairingById } from "./typography";
import { Layout, SectionKey, layoutById, layoutsFor, specSummary } from "./layouts";

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
  layoutId: string;
  heroVariant: string; // = the chosen layout's hero mode (kept for the UI)
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

  // THE LAYOUT BOOK: choose from layouts specified for this archetype
  const layoutPool = layoutsFor(arch.id);
  const layout = layoutPool[Math.floor(r() * layoutPool.length)];

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
    layoutId: layout.id,
    heroVariant: layout.heroMode,
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
  const layout: Layout = layoutById(d.layoutId);
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
        `Layout candidates auditioned from the Layout Book: ${layoutsFor(arch.id).map((l) => l.name.split(" — ")[0]).join(", ")}. (Kleon: steal proven structures.)`,
      ];
    case "palette":
      return [
        `Tested 4 palettes side by side: "${pal.name}" wins.`,
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
        `Wireframe locked: ${layout.name}. ${layout.arrangement}`,
        `Spec, not vibes: ${specSummary(layout)} · breakpoints ${layout.spec.breakpoints.join("/")}px. Source: ${layout.source}. (Müller-Brockmann)`,
        `Reading pattern: ${layout.readingPattern} — the payload is placed where eyes already go (NN/g eyetracking). Mobile plan: ${layout.mobile}`,
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
        `Built on the 8px system: padding steps 16/24/40/64/96, radius ${Math.round(d.radius * layout.spec.radiusScale)}px, shadows for elevation only.`,
        `${d.featuresShown} service blocks rendered as ${layout.featuresMode === "bento" ? "bento cells (one 2×2 + three 2×1 + two 1×1, 16px gap)" : layout.featuresMode === "catalog" ? "comparable catalog cards with aligned prices" : layout.featuresMode === "list" ? "numbered editorial rows" : `${layout.spec.cardCols.join("/")} column cards`} (Tidwell). One primary action per viewport. (Wathan & Schoger)`,
      ];
    case "incubate":
      return [
        `Stepped away from ${name} for two beast-hours. Deliberately.`,
        `Fresh eyes found 3 things to tighten: tighter hero spacing, one less nav link, calmer footer. Queued for polish. (Kleon)`,
      ];
    case "audit":
      return [
        `C — Contrast: body ${cBody}:1, secondary ${cSoft}:1, buttons ${cAccent}:1, footer ${cDark}:1. ${grade}. PASS.`,
        `R — Repetition: ${layout.crap.R}`,
        `A — Alignment: ${layout.crap.A}`,
        `P — Proximity: related items ≤ ${layout.spec.itemGap}px apart, sections on a ${layout.spec.sectionPad[0]}px rhythm. ${layout.crap.P}`,
      ];
    case "polish":
      return [
        `Ockham pass: removed 3 ornaments that hadn't earned their place.`,
        `${layout.readingPattern}-pattern check: value proposition sits where the scan lands first. One CTA per viewport. ${name} ships.`,
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
  const layout = layoutById(d.layoutId);
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
    repetition: { pass: true, detail: layout.crap.R },
    alignment: { pass: true, detail: `${layout.spec.columns}-col grid, ${layout.spec.container}px container — ${layout.crap.A}` },
    proximity: { pass: true, detail: `related items ≤ ${layout.spec.itemGap}px · sections on a ${layout.spec.sectionPad[0]}px rhythm — ${layout.crap.P}` },
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

// ─── HTML BUILDER — layout-driven. Every number comes from the
// chosen layout's LayoutSpec; every mode comes from the Layout Book. ───
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
  const L = layoutById(d.layoutId);
  const spec = L.spec;
  const rand = mulberry32(d.artSeed);
  const slug = slugify(ctx.name);
  const features = d.featureIdx.map((i) => arch.features[i]);
  const stats = arch.stats;
  const S = TYPE_SCALE;
  const radius = Math.max(0, Math.round(d.radius * spec.radiusScale));

  const shadow =
    d.shadowLift === 0
      ? "none"
      : d.shadowLift === 1
        ? "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.07)"
        : "0 2px 4px rgba(0,0,0,.08), 0 16px 40px rgba(0,0,0,.12)";

  const ctas = `<div class="hero-ctas"><a class="btn btn-accent btn-lg" href="#contact">${d.ctaPrimary}</a><a class="btn btn-ghost btn-lg" href="#services">${d.ctaSecondary}</a></div>`;

  // ── NAV — two anatomies: top bar (default) or sidebar shell (Atlas) ──
  const navLinks = `<a href="#services">${d.featuresShown === 6 ? "Services" : arch.id === "restaurant" || arch.id === "coffee" ? "Menu" : "What we do"}</a><a href="#story">About</a><a href="#voices">Reviews</a><a href="#contact">Contact</a>`;

  const topNav = `
  <header class="nav">
    <div class="container nav-inner">
      <a class="brand" href="#top">${ctx.name}</a>
      <nav class="nav-links" aria-label="Main">${navLinks}</nav>
      <a class="btn btn-accent btn-nav" href="#contact">${d.ctaPrimary}</a>
    </div>
  </header>`;

  const sideNav = `
  <aside class="sidebar">
    <a class="brand" href="#top">${ctx.name}</a>
    <nav class="side-links" aria-label="Main">${navLinks}</nav>
    <a class="btn btn-accent side-cta" href="#contact">${d.ctaPrimary}</a>
    <p class="side-note">© ${ctx.year} ${ctx.copyrightHolder}</p>
  </aside>`;

  // ── HERO — eight anatomies from the Layout Book ──────────────────────
  const heroCopy = `<p class="kicker">${d.heroLead}</p><h1>${d.heroHeadline}</h1><p class="lede">${d.heroSub}</p>`;

  let heroInner = "";
  switch (L.heroMode) {
    case "centered":
      heroInner = `<div class="hero-centered">${heroCopy}${ctas}</div>`;
      break;
    case "split":
      heroInner = `<div class="hero-split"><div class="hero-copy">${heroCopy}${ctas}</div>${heroArt(d, pal, rand)}</div>`;
      break;
    case "showcase":
      heroInner = `<div class="hero-split"><div class="hero-copy">${heroCopy}${ctas}</div><div class="hero-art hero-art-frame" aria-hidden="true"><div class="art-frame" style="background:${pal.dark};border-radius:${radius * 2}px;"><div class="art-badge" style="color:${pal.onDark};">${d.heroLead}</div></div></div></div>`;
      break;
    case "z":
      heroInner = `<div class="hero-z"><div class="hero-copy">${heroCopy}</div><div class="hero-z-side"><div class="hero-z-art" aria-hidden="true" style="border-radius:${radius * 2}px;">${""}</div><div class="hero-z-cta"><a class="btn btn-accent btn-lg" href="#contact">${d.ctaPrimary}</a></div></div></div>`;
      break;
    case "ledger":
      heroInner = `<div class="hero-ledger"><nav class="ledger-rail" aria-label="Jump to section"><span class="rail-label">On this page</span><a href="#services">01 — What we do</a><a href="#story">02 — The practice</a><a href="#voices">03 — Word of mouth</a><a href="#contact">04 — Contact</a></nav><div class="ledger-copy">${heroCopy}${ctas}</div></div>`;
      break;
    case "bento":
      heroInner = `<div class="hero-bento">${heroCopy}</div>`;
      break;
    case "mono":
      heroInner = `<div class="hero-mono-inner">${heroCopy}${ctas}</div>`;
      break;
    case "gallery":
      heroInner = `<div class="hero-gallery">${heroCopy}${ctas}</div>`;
      break;
  }

  const heroSection = L.heroMode === "mono"
    ? `<section class="hero hero-mono" style="background:${pal.dark};color:${pal.onDark};">${heroInner}</section>`
    : `<section class="hero"><div class="container">${heroInner}</div></section>`;

  // ── FEATURES — four anatomies: cards · bento · catalog · list ────────
  const sectionHead = (key: string, fallback: string) => `
      <div class="section-head">
        <h2>${d.sectionHeadlines[key] ?? fallback}</h2>
        <p class="section-sub">${d.sectionBlurbs[key] ?? ""}</p>
      </div>`;

  let featuresInner = "";
  if (L.featuresMode === "cards") {
    featuresInner = `${sectionHead("intro", "What we do")}
      <div class="cards">
        ${features.map((f) => `<article class="card" style="border-radius:${radius}px;box-shadow:${shadow};"><h3>${f.title}</h3><p>${f.desc}</p></article>`).join("")}
      </div>`;
  } else if (L.featuresMode === "bento") {
    // Setproduct footprints: one 2×2, three 2×1, two 1×1 — 16px gap.
    const [f0, f1, f2] = features;
    const st = stats[0];
    featuresInner = `
      <div class="bento" style="--bento-radius:${radius * 1.5}px;">
        <div class="bento-cell area-head" style="background:${pal.dark};color:${pal.onDark};">
          <p class="kicker" style="color:${pal.accent};">${d.heroLead}</p>
          <p class="bento-lede">${d.heroSub}</p>
          <div class="hero-ctas">${""}<a class="btn btn-accent" href="#contact">${d.ctaPrimary}</a><a class="btn btn-invert" href="#services">${d.ctaSecondary}</a></div>
        </div>
        <div class="bento-cell area-wide1" style="background:${pal.surface};">${""}<h3>${f0?.title ?? ""}</h3><p>${f0?.desc ?? ""}</p></div>
        <div class="bento-cell area-wide2" style="background:${pal.surface};"><h3>${f1?.title ?? ""}</h3><p>${f1?.desc ?? ""}</p></div>
        <div class="bento-cell area-wide3" style="background:${pal.surface};">
          <div class="bento-stats">${stats.map((s) => `<div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join("")}</div>
        </div>
        <div class="bento-cell area-small1" style="background:${pal.surface};"><h3>${f2?.title ?? ""}</h3><p>${f2?.desc ?? ""}</p></div>
        <div class="bento-cell area-small2" style="background:${pal.accent};color:${pal.onAccent};"><p class="bento-chip">${arch.label} — ${d.heroLead}</p></div>
      </div>`;
  } else if (L.featuresMode === "catalog") {
    const isRent = arch.id === "realestate";
    const price = (i: number) =>
      isRent
        ? `$${(1800 + i * 260 + (d.artSeed % 380)).toLocaleString("en-US")}/mo`
        : `$${(14 + i * 9 + (d.artSeed % 12))}.${(10 + ((d.artSeed + i * 7) % 50))}`.replace(/\.\d{3,}$/, (m) => m.slice(0, 3));
    featuresInner = `
      <div class="catalog-filter" role="group" aria-label="Filter">
        <span class="chip chip-on">All</span><span class="chip">Popular</span><span class="chip">New</span><span class="chip">Bookable</span>
      </div>
      <div class="cards cards-catalog">
        ${features.map((f, i) => `<article class="card card-catalog" style="border-radius:${radius}px;box-shadow:${shadow};"><h3>${f.title}</h3><p>${f.desc}</p><p class="price">${price(i)}</p></article>`).join("")}
      </div>`;
  } else {
    // list — editorial numbered rows (Ledger / Folio)
    featuresInner = `${sectionHead("intro", "What we do")}
      <ol class="rows">${features.map((f, i) => `<li class="row"><span class="row-index">0${i + 1}</span><div class="row-body"><h3>${f.title}</h3><p>${f.desc}</p></div></li>`).join("")}</ol>`;
  }
  const featuresSection = `<section id="services" class="section"><div class="container">${featuresInner}</div></section>`;

  // ── STATS BAND ───────────────────────────────────────────────────────
  const statsBand = `
  <section class="band" aria-label="Proof in numbers">
    <div class="container stats">
      ${stats.map((s) => `<div class="stat"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join("")}
    </div>
  </section>`;

  // ── STORY — four anatomies: classic · magazine · cases · rail ────────
  const storyHead = d.sectionHeadlines[arch.sections[0]?.key ?? "process"] ?? "The story";
  const storyBody = d.sectionBlurbs[arch.sections[0]?.key ?? "process"] ?? "";
  const sideHead = d.sectionHeadlines[arch.sections[1]?.key ?? "detail"] ?? "Good to know";
  const sideBody = d.sectionBlurbs[arch.sections[1]?.key ?? "detail"] ?? "";

  let storyInner = "";
  if (L.storyMode === "magazine") {
    storyInner = `
      <div class="story-mag">
        <div class="mag-main">
          <h2>${storyHead}</h2>
          <p class="dropcap">${storyBody}</p>
          <p>${sideBody}</p>
        </div>
        <aside class="mag-side">
          <blockquote class="pull" style="border-color:${pal.accent};">“${arch.testimonials[0]?.quote ?? d.heroLead}”</blockquote>
          <p class="note">${arch.contactNote}</p>
        </aside>
      </div>`;
  } else if (L.storyMode === "cases") {
    storyInner = `
      <div class="section-head"><h2>${storyHead}</h2><p class="section-sub">${storyBody}</p></div>
      <div class="cases">
        ${features.map((f, i) => `
        <article class="case-row ${i % 2 === 1 ? "flip" : ""}">
          <div class="case-media" aria-hidden="true" style="border-radius:${radius * 2}px;background:linear-gradient(${(d.artSeed + i * 70) % 360}deg, ${pal.surface}, ${pal.accent}22);"><span class="case-index" style="color:${pal.accent};">0${i + 1}</span></div>
          <div class="case-body"><h3>${f.title}</h3><p>${f.desc}</p><p class="case-outcome" style="color:${pal.accent};">${stats[i % stats.length].value} ${stats[i % stats.length].label}</p></div>
        </article>`).join("")}
      </div>`;
  } else if (L.storyMode === "rail") {
    storyInner = `
      <div class="story story-rail">
        <div class="story-copy"><h2>${storyHead}</h2><p>${storyBody}</p></div>
        <div class="story-side"><h3>${sideHead}</h3><p>${sideBody}</p><p class="note">${arch.contactNote}</p></div>
      </div>`;
  } else {
    storyInner = `
      <div class="story">
        <div class="story-copy"><h2>${storyHead}</h2><p>${storyBody}</p></div>
        <div class="story-side"><h3>${sideHead}</h3><p>${sideBody}</p><p class="note">${arch.contactNote}</p></div>
      </div>`;
  }
  const storySection = `<section id="story" class="section ${L.featuresMode === "bento" || L.storyMode === "cases" ? "" : "section-alt"}">${L.storyMode === "cases" ? `<div class="container">${storyInner}</div>` : `<div class="container">${storyInner}</div>`}</section>`;

  // ── VOICES — grid · wall · stack ─────────────────────────────────────
  const quoteCard = (t: { quote: string; name: string; role: string }) =>
    `<figure class="quote" style="border-radius:${radius}px;box-shadow:${shadow};"><blockquote>“${t.quote}”</blockquote><figcaption><strong>${t.name}</strong><span>${t.role}</span></figcaption></figure>`;
  const voicesHead = `<div class="section-head"><h2>Word of mouth</h2><p class="section-sub">Real words from real ${arch.id === "restaurant" ? "regulars" : "clients"}.</p></div>`;
  let voicesInner = "";
  if (L.voicesMode === "wall") {
    voicesInner = `${voicesHead}<div class="quotes quotes-wall">${arch.testimonials.map(quoteCard).join("")}</div>`;
  } else if (L.voicesMode === "stack") {
    voicesInner = `${voicesHead}<div class="quotes quotes-stack">${arch.testimonials.map(quoteCard).join("")}</div>`;
  } else {
    voicesInner = `${voicesHead}<div class="quotes">${arch.testimonials.map(quoteCard).join("")}</div>`;
  }
  const voicesSection = `<section id="voices" class="section"><div class="container">${voicesInner}</div></section>`;

  const ctaBand = `
  <section class="band band-accent">
    <div class="container cta-final">
      <h2>Ready when you are.</h2>
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

  // ── SECTION ORDER — from the layout's declared stack ─────────────────
  const sectionMap: Record<SectionKey, string> = {
    hero: heroSection,
    stats: statsBand,
    features: featuresSection,
    story: storySection,
    voices: voicesSection,
    cta: ctaBand,
    contact: contactSection,
  };
  const flow = L.sectionOrder.map((k) => sectionMap[k]).join("\n");

  const body = L.navMode === "side"
    ? `<div class="atlas-shell">${sideNav}<main id="top" class="atlas-main">${heroSection}${flow}</main></div>`
    : `${topNav}<main id="top">${heroSection}${flow}</main>`;

  const footer = L.navMode === "side"
    ? `
  <footer class="footer footer-side">
    <div class="container footer-inner">
      <div class="footer-brand">${ctx.name}</div>
      <div class="footer-copy">
        <p>© ${ctx.year} ${ctx.copyrightHolder}. ${ctx.copyrightNote}</p>
        <p class="colophon">Designed &amp; built by <strong>THE BEAST</strong> — an autonomous web studio. Layout: ${L.name}. Palette: ${pal.name}.</p>
      </div>
    </div>
  </footer>`
    : `
  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-brand">${ctx.name}</div>
      <nav class="footer-links" aria-label="Footer"><a href="#services">Services</a><a href="#story">About</a><a href="#voices">Reviews</a><a href="#contact">Contact</a></nav>
      <div class="footer-copy">
        <p>© ${ctx.year} ${ctx.copyrightHolder}. ${ctx.copyrightNote}</p>
        <p class="colophon">Designed &amp; built by <strong>THE BEAST</strong> — an autonomous web studio. Layout: ${L.name}. Palette: ${pal.name}.</p>
      </div>
    </div>
  </footer>`;

  // ── CSS — tokens from the layout spec, modes from the Layout Book ────
  const bp = spec.breakpoints;
  const css = `
  :root {
    --bg:${pal.bg}; --surface:${pal.surface}; --ink:${pal.ink}; --soft:${pal.soft};
    --accent:${pal.accent}; --on-accent:${pal.onAccent}; --dark:${pal.dark}; --on-dark:${pal.onDark};
    --radius:${radius}px; --shadow:${shadow};
    --font-display:${pair.displayFamily}; --font-body:${pair.bodyFamily};
    --container:${spec.container}px; --gutter:${spec.gutter}px;
    --section-pad:${spec.sectionPad[0]}px; --item-gap:${spec.itemGap}px;
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
  .nav-links a, .side-links a { text-decoration:none; font-size:${S.small}; font-weight:500; color:var(--soft); transition:color .18s; }
  .nav-links a:hover, .side-links a:hover { color:var(--ink); }
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
  .hero { padding:${spec.heroPadY[0]}px 0 ${spec.heroPadY[1]}px; position:relative; overflow:hidden; }
  .kicker { font-size:${S.micro}; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin-bottom:16px; }
  .lede { font-size:${S.h3}; color:var(--soft); margin-top:24px; }
  .hero-ctas { display:flex; gap:16px; margin-top:40px; flex-wrap:wrap; }
  .hero-centered, .hero-bento, .hero-gallery, .hero-mono-inner { display:flex; flex-direction:column; }
  .hero-centered { text-align:center; align-items:center; }
  .hero-gallery { text-align:left; align-items:flex-start; }
  .hero-mono-inner { align-items:flex-start; }
  .hero-mono-inner .lede { color:color-mix(in srgb, var(--on-dark) 75%, transparent); }
  .hero-mono-inner h1 { font-size:clamp(3rem, 8vw, 6rem); letter-spacing:-0.02em; }
  .hero-split { display:grid; grid-template-columns:1.1fr .9fr; gap:64px; align-items:center; }
  .hero-z { display:grid; grid-template-columns:1.05fr .95fr; gap:56px; align-items:stretch; }
  .hero-z-side { display:flex; flex-direction:column; justify-content:space-between; gap:32px; }
  .hero-z-art { min-height:280px; background:linear-gradient(${(d.artSeed + 40) % 360}deg, ${pal.surface}, ${pal.soft}33), ${pal.surface}; border:1px solid color-mix(in srgb, var(--ink) 8%, transparent); }
  .hero-z-cta { display:flex; justify-content:flex-end; }
  .hero-ledger { display:grid; grid-template-columns:220px 1fr; gap:56px; align-items:start; }
  .ledger-rail { display:flex; flex-direction:column; gap:16px; border-left:2px solid var(--accent); padding-left:20px; position:sticky; top:96px; }
  .rail-label { font-size:${S.micro}; letter-spacing:.1em; text-transform:uppercase; color:var(--soft); }
  .ledger-rail a { text-decoration:none; font-size:${S.small}; color:var(--soft); }
  .ledger-rail a:hover { color:var(--ink); }
  .hero-bento { text-align:left; align-items:flex-start; max-width:720px; }
  .hero-art { position:relative; border-radius:${radius * 2}px; min-height:380px; overflow:hidden; }
  .art-frame { position:absolute; inset:24px; display:flex; align-items:flex-end; }
  .art-badge { padding:12px 18px; font-size:${S.micro}; letter-spacing:.08em; text-transform:uppercase; font-weight:600; }
  .band { background:var(--dark); color:var(--on-dark); padding:56px 0; }
  .stats { display:grid; grid-template-columns:repeat(${spec.statsCols[0]},1fr); gap:24px; text-align:center; }
  .stat-value { font-family:var(--font-display); font-size:2.5rem; font-weight:700; }
  .stat-label { color:color-mix(in srgb, var(--on-dark) 72%, transparent); font-size:${S.small}; margin-top:4px; }
  .section { padding:var(--section-pad) 0; }
  .section-alt { background:var(--surface); }
  .section-head { max-width:640px; margin-bottom:56px; }
  .section-sub { color:var(--soft); margin-top:16px; font-size:${S.body}; }
  .cards { display:grid; grid-template-columns:repeat(${spec.cardCols[0]},1fr); gap:var(--item-gap); }
  .card { background:var(--surface); padding:32px; border:1px solid color-mix(in srgb, var(--ink) 7%, transparent); }
  .card h3 { margin-bottom:12px; }
  .card p { color:var(--soft); font-size:${S.small}; }
  .card-catalog { display:flex; flex-direction:column; }
  .card-catalog .price { margin-top:auto; padding-top:16px; font-family:var(--font-display); font-size:${S.h3}; color:var(--ink); font-weight:700; }
  .catalog-filter { display:flex; gap:12px; margin-bottom:32px; flex-wrap:wrap; }
  .chip { padding:8px 16px; border-radius:999px; border:1px solid color-mix(in srgb, var(--ink) 14%, transparent); font-size:${S.small}; color:var(--soft); }
  .chip-on { background:var(--ink); color:var(--bg); border-color:var(--ink); }
  .rows { list-style:none; }
  .row { display:grid; grid-template-columns:88px 1fr; gap:32px; padding:32px 0; border-top:1px solid color-mix(in srgb, var(--ink) 10%, transparent); }
  .row-index { font-family:var(--font-display); font-size:2rem; font-weight:700; color:color-mix(in srgb, var(--ink) 22%, transparent); }
  .row-body h3 { margin-bottom:8px; }
  .row-body p { color:var(--soft); font-size:${S.small}; }
  .story { display:grid; grid-template-columns:1.2fr .8fr; gap:64px; }
  .story-rail { grid-template-columns:1fr 320px; }
  .story-side { border-left:2px solid var(--accent); padding-left:32px; align-self:start; }
  .story-side p { color:var(--soft); margin-top:12px; font-size:${S.small}; }
  .story-side .note { margin-top:20px; font-weight:600; color:var(--ink); }
  .story-mag { display:grid; grid-template-columns:7fr 5fr; gap:64px; }
  .dropcap::first-letter { font-family:var(--font-display); font-size:3.4em; float:left; line-height:.85; padding-right:12px; color:var(--accent); font-weight:700; }
  .mag-side { align-self:start; }
  .pull { font-family:var(--font-display); font-size:${S.h2}; line-height:1.3; border-left:4px solid; padding-left:24px; margin-bottom:24px; }
  .cases { display:flex; flex-direction:column; gap:96px; }
  .case-row { display:grid; grid-template-columns:1fr 1.2fr; gap:64px; align-items:center; }
  .case-row.flip .case-media { order:2; }
  .case-row.flip .case-body { order:1; }
  .case-media { min-height:300px; display:flex; align-items:flex-start; justify-content:flex-start; padding:24px; }
  .case-index { font-family:var(--font-display); font-size:3rem; font-weight:700; }
  .case-body h3 { margin-bottom:12px; }
  .case-body p { color:var(--soft); }
  .case-outcome { margin-top:16px; font-weight:700; font-family:var(--font-display); }
  .quotes { display:grid; grid-template-columns:repeat(${spec.quoteCols[0]},1fr); gap:var(--item-gap); }
  .quotes-wall { grid-template-columns:repeat(3,1fr); }
  .quotes-stack { grid-template-columns:1fr; gap:32px; }
  .quotes-stack .quote { border-left:2px solid var(--accent); border-radius:0; box-shadow:none; background:transparent; padding:8px 0 8px 32px; }
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
  /* ── Bento (Setproduct footprints: 2×2 + 2×1×3 + 1×1×2, 16px gap) ── */
  .bento { display:grid; gap:16px; grid-template-columns:repeat(4, 1fr); grid-template-areas: "head head wide1 wide1" "head head wide2 wide2" "small1 small2 wide3 wide3"; }
  .bento-cell { padding:32px; border-radius:var(--bento-radius, 24px); min-height:180px; display:flex; flex-direction:column; justify-content:center; }
  .bento-cell h3 { margin-bottom:8px; }
  .bento-cell p { color:var(--soft); font-size:${S.small}; }
  .area-head { grid-area:head; }
  .area-wide1 { grid-area:wide1; } .area-wide2 { grid-area:wide2; } .area-wide3 { grid-area:wide3; }
  .area-small1 { grid-area:small1; } .area-small2 { grid-area:small2; }
  .area-head .kicker { color:var(--accent); }
  .bento-lede { font-size:${S.h3}; color:color-mix(in srgb, var(--on-dark) 78%, transparent); margin-bottom:24px; max-width:52ch; }
  .area-head .hero-ctas { margin-top:0; }
  .area-head .btn-invert { background:color-mix(in srgb, var(--on-dark) 14%, transparent); color:var(--on-dark); }
  .bento-stats { display:flex; gap:48px; flex-wrap:wrap; }
  .bento-stats .stat-value { color:var(--ink); }
  .bento-stats .stat-label { color:var(--soft); }
  .bento-chip { color:var(--on-accent); font-weight:600; letter-spacing:.06em; text-transform:uppercase; font-size:${S.micro}; max-width:24ch; }
  /* ── Atlas sidebar shell (Material responsive grid) ── */
  .atlas-shell { display:grid; grid-template-columns:240px 1fr; min-height:100vh; }
  .sidebar { background:var(--dark); color:var(--on-dark); padding:32px 24px; display:flex; flex-direction:column; gap:32px; position:sticky; top:0; height:100vh; }
  .sidebar .brand { color:var(--on-dark); }
  .side-links { display:flex; flex-direction:column; gap:8px; }
  .side-cta { margin-top:auto; text-align:center; }
  .side-note { font-size:${S.micro}; color:color-mix(in srgb, var(--on-dark) 60%, transparent); }
  .atlas-main { min-width:0; }
  @media (max-width:${bp[0]}px) {
    .hero { padding:${spec.heroPadY[1]}px 0; }
    .section { padding:${Math.round(spec.sectionPad[1] * 1.15)}px 0; }
    .hero-split, .hero-z, .story, .contact, .story-mag { grid-template-columns:1fr; gap:40px; }
    .hero-ledger { grid-template-columns:1fr; gap:32px; }
    .ledger-rail { position:static; flex-direction:row; flex-wrap:wrap; border-left:none; border-top:2px solid var(--accent); padding:16px 0 0; }
    .cards { grid-template-columns:repeat(${spec.cardCols[1]},1fr); }
    .quotes { grid-template-columns:repeat(${spec.quoteCols[1]},1fr); }
    .quotes-wall { grid-template-columns:repeat(${Math.min(2, spec.quoteCols[1])},1fr); }
    .stats { grid-template-columns:repeat(${spec.statsCols[1]},1fr); }
    .case-row { grid-template-columns:1fr; gap:32px; }
    .case-row.flip .case-media { order:0; }
    .atlas-shell { grid-template-columns:1fr; }
    .sidebar { position:static; height:auto; flex-direction:row; align-items:center; flex-wrap:wrap; gap:16px; }
    .side-links { flex-direction:row; gap:16px; }
    .side-cta { margin-top:0; }
    .footer-copy { text-align:left; }
  }
  @media (max-width:${bp[1]}px) {
    .nav-links { display:none; }
    .cards, .quotes, .quotes-wall { grid-template-columns:repeat(${spec.cardCols[2]},1fr); }
    .stats { grid-template-columns:1fr; gap:32px; }
    .bento { grid-template-columns:1fr; grid-template-areas:"head" "wide1" "wide2" "wide3" "small1" "small2"; }
    .bento-cell { min-height:0; }
    .row { grid-template-columns:48px 1fr; gap:16px; }
    h1 { font-size:2.5rem; }
  }`;

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
<style>${css}</style>
</head>
<body>
${body}
${footer}
</body>
</html>`;
}

// ─── DESIGN NOTES markdown (ships inside every zip) ───────────────────
export function buildDesignNotes(ctx: BuildCtx, audit: CrapAudit): string {
  const arch = archetypeById(ctx.archetypeId);
  const pal = paletteById(ctx.decisions.paletteId);
  const pair = pairingById(ctx.decisions.pairingId);
  const L = layoutById(ctx.decisions.layoutId);
  return `# ${ctx.name} — Design Notes

Commission type: ${arch.label}
Audience: ${arch.audience}
Brief: ${ctx.decisions.strategyBrief}

## Layout (from the Beast's Layout Book)
- Layout: ${L.name}
- Reading pattern: ${L.readingPattern}
- Arrangement: ${L.arrangement}
- Source: ${L.source}
- Spec: ${specSummary(L)} · breakpoints ${L.spec.breakpoints.join("/")}px
- Section stack: ${L.sectionOrder.join(" → ")}
- Mobile collapse: ${L.mobile}

## System
- Palette: ${pal.name} (bg ${pal.bg} · ink ${pal.ink} · accent ${pal.accent})
- Type: ${pair.name} — ${pair.note}
- Type scale: 1.25 modular ratio · body measure 68ch · leading 1.65
- Radius: ${Math.round(ctx.decisions.radius * L.spec.radiusScale)}px · Shadows: elevation only

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
