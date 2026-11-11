// ══════════════════════════════════════════════════════════════════════
//  THE LAYOUT BOOK — twelve fully specified page layouts.
//
//  This is the answer to "the layouts aren't specified". Every layout
//  carries its exact geometry: container width, column count, gutters,
//  hero paddings, section rhythm, card columns per breakpoint, reading
//  pattern, and how each C.R.A.P. principle (Williams) is satisfied.
//  Sources are real and citable — the generator cites them by name.
//
//  Research base:
//  · NN/g eyetracking: F-shaped reading (Nielsen 2006, reconfirmed 2017)
//    and Z/layer-cake/spotted patterns for low-density pages.
//  · Material Design responsive layout grid: 4/8/12-column grids,
//    sidebar + content body, breakpoints ~600/905/1240.
//  · MDN "Realizing common layouts using grids": 12-col systems,
//    magazine asymmetric spans, split heroes.
//  · Bento grid math (Setproduct layout guide): explicit footprints —
//    one 2×2, two or three 2×1, remainder 1×1 — 16px gap,
//    grid-template-areas per breakpoint, gap:radius ratio preserved.
//  · Müller-Brockmann Grid Systems: asymmetric fields, rhythm by
//    alternation, white space as an active element.
//  · Breakpoints (NN/g): content-driven, 2–3 breakpoints, mobile-first.
// ══════════════════════════════════════════════════════════════════════

// ─── The measurable spec every layout must declare ────────────────────
export interface LayoutSpec {
  container: number; // max content width, px
  columns: number; // underlying grid columns (12 unless the pattern says so)
  gutter: number; // column gutter / container side padding, px
  heroPadY: [number, number]; // hero padding desktop, mobile — px
  sectionPad: [number, number]; // section padding desktop, mobile — px
  sectionGap: number; // distance between sibling blocks (Proximity: apart)
  itemGap: number; // distance between related items (Proximity: together)
  cardCols: [number, number, number]; // feature cards: desktop / ≤900 / ≤640
  quoteCols: [number, number, number]; // testimonial columns
  statsCols: [number, number, number]; // stats band columns
  breakpoints: [number, number]; // tablet, mobile (content-driven, NN/g)
  radiusScale: number; // multiplier applied to the chosen radius
}

export type HeroMode =
  | "centered" // statement down the center axis
  | "split" // copy left / art right, 1.1fr : 0.9fr
  | "z" // Z-path: payload top-left, CTA bottom-right
  | "ledger" // F-path: headline bar, wide lede bar, left stem rail
  | "bento" // headline is the 2×2 cell of a bento grid
  | "mono" // full-bleed dark statement, edge to edge
  | "gallery" // headline + immediate card wall peek
  | "showcase"; // copy left / framed artifact right

export type SectionKey = "hero" | "stats" | "features" | "story" | "voices" | "cta" | "contact";

export interface Layout {
  id: string;
  name: string;
  source: string; // real, citable research
  readingPattern: "Z" | "F" | "Layer-cake" | "Spotted";
  arrangement: string; // the geometry in one line
  heroMode: HeroMode;
  sectionOrder: SectionKey[]; // exact vertical order after the hero
  storyMode: "classic" | "magazine" | "cases" | "rail";
  featuresMode: "cards" | "bento" | "catalog" | "list";
  voicesMode: "grid" | "wall" | "stack";
  navMode: "top" | "side";
  spec: LayoutSpec;
  bestFor: string[]; // archetype ids this layout serves first
  crap: { C: string; R: string; A: string; P: string };
  mobile: string; // how it collapses (NN/g: 2–3 content-driven breakpoints)
}

const BASE: LayoutSpec = {
  container: 1140,
  columns: 12,
  gutter: 24,
  heroPadY: [96, 56],
  sectionPad: [96, 64],
  sectionGap: 0, // sections are self-spaced by padding
  itemGap: 24,
  cardCols: [3, 2, 1],
  quoteCols: [2, 1, 1],
  statsCols: [3, 3, 1],
  breakpoints: [900, 640],
  radiusScale: 1,
};

export const LAYOUTS: Layout[] = [
  // ── 1 ────────────────────────────────────────────────────────────────
  {
    id: "aurora",
    name: "Aurora — Centered Statement",
    source: "Z-pattern for low-density pages (NN/g); Material 12-col responsive grid",
    readingPattern: "Z",
    arrangement: "Single center axis. Kicker → H1 → lede → two CTAs stacked down the middle; stats band dark; cards 3-up.",
    heroMode: "centered",
    sectionOrder: ["stats", "features", "story", "voices", "cta", "contact"],
    storyMode: "classic",
    featuresMode: "cards",
    voicesMode: "grid",
    navMode: "top",
    spec: { ...BASE, container: 1140, heroPadY: [104, 64] },
    bestFor: ["saas", "agency", "wellness", "dental"],
    crap: {
      C: "Dark stats band and accent band punch against the pale field; display size 3× body.",
      R: "One axis, one accent, one radius — the center axis repeats in every section head.",
      A: "Everything centers on a single vertical axis; nothing sits a pixel off it.",
      P: "Kicker/H1/lede grouped at 16/24px; CTAs pulled 40px below as a second group.",
    },
    mobile: "Single column; nav links collapse; stats stack 1-up; cards 1-up.",
  },
  // ── 2 ────────────────────────────────────────────────────────────────
  {
    id: "splitline",
    name: "Splitline — Split-Screen Hero",
    source: "Split-screen hero pattern (MDN grid layouts; 50/50 landing heroes)",
    readingPattern: "Z",
    arrangement: "Hero splits 1.1fr copy : 0.9fr abstract art. Story alternates 1.2fr : 0.8fr with an accent rule rail.",
    heroMode: "split",
    sectionOrder: ["features", "stats", "voices", "story", "cta", "contact"],
    storyMode: "classic",
    featuresMode: "cards",
    voicesMode: "grid",
    navMode: "top",
    spec: { ...BASE, container: 1200, heroPadY: [96, 56] },
    bestFor: ["agency", "realestate", "fitness", "saas"],
    crap: {
      C: "Two unequal halves (55/45) — contrast by proportion, not 50/50 monotony.",
      R: "The 2-column split repeats: hero, story, contact all use the same skeleton.",
      A: "Copy column left edge = container left edge; art column bleeds to the right edge.",
      P: "Hero copy and CTAs stay one group; the art half is pure, no text mixed in.",
    },
    mobile: "Split stacks copy-above-art; grids drop to 1 column at 640.",
  },
  // ── 3 ────────────────────────────────────────────────────────────────
  {
    id: "bentoblox",
    name: "Bentoblox — Bento Grid",
    source: "Bento layout math (Setproduct): footprints 2×2 + 2×1s + 1×1s, 16px gap, named grid areas",
    readingPattern: "Spotted",
    arrangement: "Features ARE the hero: a 4-col bento — one 2×2 headline cell, two 2×1 cells, two 1×1 cells. 16px gap, 24px radius.",
    heroMode: "bento",
    sectionOrder: ["features", "stats", "story", "voices", "cta", "contact"],
    storyMode: "classic",
    featuresMode: "bento",
    voicesMode: "grid",
    navMode: "top",
    spec: { ...BASE, container: 1200, itemGap: 16, heroPadY: [80, 48], cardCols: [1, 1, 1], radiusScale: 1.5 },
    bestFor: ["saas", "agency", "portfolio"],
    crap: {
      C: "The 2×2 headline cell carries the accent; support cells stay quiet — hierarchy by footprint.",
      R: "Gap locked at 16px and radius locked at 24px across every cell (gap:radius ratio kept).",
      A: "Every cell edge lands on the 4-column grid lines — grid-template-areas, no floats.",
      P: "Related cells touch (16px); unrelated sections breathe 96px apart.",
    },
    mobile: "Areas dissolve to one column in DOM order: headline first (Setproduct fallback rule).",
  },
  // ── 4 ────────────────────────────────────────────────────────────────
  {
    id: "ledger",
    name: "Ledger — F-Pattern Editorial",
    source: "F-shaped reading (NN/g eyetracking, Nielsen 2006; reconfirmed 2017)",
    readingPattern: "F",
    arrangement: "Headline bar top-left, wide lede bar beneath, then content scans down a left stem: sticky rail + measured prose.",
    heroMode: "ledger",
    sectionOrder: ["features", "story", "voices", "stats", "cta", "contact"],
    storyMode: "rail",
    featuresMode: "list",
    voicesMode: "stack",
    navMode: "top",
    spec: { ...BASE, container: 1160, heroPadY: [88, 56], cardCols: [1, 1, 1], quoteCols: [1, 1, 1] },
    bestFor: ["law", "realestate", "portfolio", "wellness"],
    crap: {
      C: "Display headline dwarfs the measured body; the left rail carries the accent.",
      R: "Every section repeats the same F-skeleton: head top-left, prose down the stem.",
      A: "Two hard axes only — the rail edge and the text column edge.",
      P: "Headline and lede within 24px (one thought); rail links grouped 16px apart.",
    },
    mobile: "Rail becomes a horizontal chip row; prose full width, measure stays ≤68ch.",
  },
  // ── 5 ────────────────────────────────────────────────────────────────
  {
    id: "zenith",
    name: "Zenith — Z-Path Conversion",
    source: "Z-pattern landing (CTA placed along the Z's terminal — 99designs/NN/g synthesis)",
    readingPattern: "Z",
    arrangement: "Z-path hero: logo → headline (top-left) → art (diagonal) → CTA bottom-right. Proof band before the final CTA.",
    heroMode: "z",
    sectionOrder: ["stats", "voices", "features", "story", "cta", "contact"],
    storyMode: "classic",
    featuresMode: "cards",
    voicesMode: "wall",
    navMode: "top",
    spec: { ...BASE, container: 1200, heroPadY: [96, 64] },
    bestFor: ["fitness", "barbershop", "landscaping", "coffee"],
    crap: {
      C: "Accent reserved for the CTA at the Z's end — the only loud element on the field.",
      R: "Z repeats in miniature: every section head leads top-left and lands with a link bottom-right.",
      A: "Headline snaps top-left corner; CTA snaps bottom-right — the Z's two anchors.",
      P: "Value proposition, lede and CTA each get their own group, spaced 24/32px.",
    },
    mobile: "Z flattens to reading order: headline → art → CTA; nothing depends on the diagonal.",
  },
  // ── 6 ────────────────────────────────────────────────────────────────
  {
    id: "gallerywall",
    name: "Gallerywall — Card Wall",
    source: "Card-based layout pattern; layer-cake scanning (NN/g text-scanning study)",
    readingPattern: "Layer-cake",
    arrangement: "Left-aligned headline over an immediate 3-up card wall; testimonials form a 3-up wall; dark proof band.",
    heroMode: "gallery",
    sectionOrder: ["features", "story", "voices", "stats", "cta", "contact"],
    storyMode: "classic",
    featuresMode: "cards",
    voicesMode: "wall",
    navMode: "top",
    spec: { ...BASE, container: 1200, heroPadY: [80, 56] },
    bestFor: ["restaurant", "coffee", "dental", "wellness"],
    crap: {
      C: "Cards rise off the page with one shadow level; dark band interrupts the cake.",
      R: "Identical card anatomy repeats — same padding, radius, title size, body color.",
      A: "Card columns share hard left/right edges; headline left-aligns with the wall.",
      P: "Title and body inside a card never exceed 12px apart; cards 24px apart.",
    },
    mobile: "Wall reflows 3→2→1; band stats stack with 32px gaps.",
  },
  // ── 7 ────────────────────────────────────────────────────────────────
  {
    id: "atlas",
    name: "Atlas — Sidebar Studio",
    source: "Material responsive layout grid: persistent sidebar + 8/12-col content body",
    readingPattern: "Spotted",
    arrangement: "240px fixed sidebar (brand, anchor nav, CTA) beside the content column; sections run as alternating rows.",
    heroMode: "centered",
    sectionOrder: ["features", "stats", "story", "voices", "contact", "cta"],
    storyMode: "classic",
    featuresMode: "cards",
    voicesMode: "grid",
    navMode: "side",
    spec: { ...BASE, container: 1040, heroPadY: [72, 48], sectionPad: [72, 56], cardCols: [3, 2, 1] },
    bestFor: ["saas", "agency", "realestate"],
    crap: {
      C: "Sidebar inverts to the dark field; content stays pale — permanent contrast anchor.",
      R: "Row skeleton (head left, body right) repeats down the content column.",
      A: "Two axes: sidebar's left edge and the content column's grid edges.",
      P: "Nav links group 8px apart in the sidebar; sections separate 72px.",
    },
    mobile: "≤900 the sidebar becomes a top bar; content reflows to the full 12 columns.",
  },
  // ── 8 ────────────────────────────────────────────────────────────────
  {
    id: "folio",
    name: "Folio — Asymmetric Magazine",
    source: "Müller-Brockmann asymmetric fields; MDN magazine grid (spans across rows)",
    readingPattern: "F",
    arrangement: "Story becomes a magazine spread: 7/5 asymmetric columns, drop cap, accent pull-quote spanning the narrow field.",
    heroMode: "showcase",
    sectionOrder: ["story", "features", "voices", "stats", "cta", "contact"],
    storyMode: "magazine",
    featuresMode: "list",
    voicesMode: "grid",
    navMode: "top",
    spec: { ...BASE, container: 1200, heroPadY: [88, 56], cardCols: [3, 2, 1] },
    bestFor: ["portfolio", "restaurant", "wellness", "coffee"],
    crap: {
      C: "Drop cap and pull-quote are the two loud types; everything else stays quiet.",
      R: "The 7/5 column ratio repeats: story, features, contact share the same fields.",
      A: "All fields snap to the 12 columns (7+5); pull-quote right-aligns the 5-col field.",
      P: "Caption sits 8px under its image zone; pull-quote pinned inside its field.",
    },
    mobile: "Fields stack full-width; drop cap retained, pull-quote becomes a left-rule block.",
  },
  // ── 9 ────────────────────────────────────────────────────────────────
  {
    id: "monolith",
    name: "Monolith — Full-Bleed Statement",
    source: "Full-page layout pattern (single immersive surface; poster typography)",
    readingPattern: "Z",
    arrangement: "Edge-to-edge dark hero, poster-weight display type, no container box; content sections run narrow (720px measure).",
    heroMode: "mono",
    sectionOrder: ["stats", "features", "voices", "story", "cta", "contact"],
    storyMode: "classic",
    featuresMode: "cards",
    voicesMode: "grid",
    navMode: "top",
    spec: { ...BASE, container: 1140, heroPadY: [128, 80], radiusScale: 0, cardCols: [3, 2, 1] },
    bestFor: ["fitness", "barbershop", "portfolio", "agency"],
    crap: {
      C: "Near-black field vs paper body sections — the loudest contrast in the book.",
      R: "Zero radius everywhere; the square edge is the signature, repeated site-wide.",
      A: "Poster text sits on the center axis; sections keep a strict left column at 720px.",
      P: "One thought per viewport-height band; groups separated by ≥96px.",
    },
    mobile: "Display type scales via clamp; bands keep their full-bleed edges.",
  },
  // ── 10 ───────────────────────────────────────────────────────────────
  {
    id: "hive",
    name: "Hive — Anchored One-Pager",
    source: "One-page convention + layer-cake scanning (NN/g); sticky nav with anchor rail",
    readingPattern: "Layer-cake",
    arrangement: "Sticky top nav with a visible anchor chip-row; numbered sections (01–04) so skimmers can count the layers.",
    heroMode: "centered",
    sectionOrder: ["features", "voices", "story", "stats", "contact", "cta"],
    storyMode: "classic",
    featuresMode: "cards",
    voicesMode: "wall",
    navMode: "top",
    spec: { ...BASE, container: 1100, heroPadY: [88, 56] },
    bestFor: ["dental", "wellness", "landscaping", "coffee"],
    crap: {
      C: "Section numbers render oversized and pale — quiet contrast that orients the eye.",
      R: "The numbered-chip anatomy repeats in nav, section heads and footer.",
      A: "Chips, section heads and cards all align to the same left column edge.",
      P: "Number sits 8px above its section head — number+head read as one unit.",
    },
    mobile: "Chip-row scrolls horizontally; anchor jumps keep the numbered order.",
  },
  // ── 11 ───────────────────────────────────────────────────────────────
  {
    id: "studio",
    name: "Studio — Case-Study Scroll",
    source: "Zig-zag layout pattern; portfolio case-study convention (problem → process → outcome)",
    readingPattern: "F",
    arrangement: "Story becomes alternating case rows (media right / media left, 1fr : 1.2fr), each with an index and outcome stat.",
    heroMode: "showcase",
    sectionOrder: ["stats", "features", "story", "voices", "cta", "contact"],
    storyMode: "cases",
    featuresMode: "cards",
    voicesMode: "grid",
    navMode: "top",
    spec: { ...BASE, container: 1200, heroPadY: [96, 64] },
    bestFor: ["portfolio", "agency", "landscaping", "realestate"],
    crap: {
      C: "Alternating row direction creates motion; outcome stats render in accent.",
      R: "Every case row shares one anatomy: index, title, prose, outcome — flipped.",
      A: "Media blocks bleed alternately to container edges; text keeps its column.",
      P: "Index+title+prose group tight (≤24px); rows separated 96px.",
    },
    mobile: "Rows stack media-then-text; alternation becomes rhythm of spacing only.",
  },
  // ── 12 ───────────────────────────────────────────────────────────────
  {
    id: "market",
    name: "Market — Catalog Grid",
    source: "Card-based catalog pattern (e-commerce); repetition for comparability",
    readingPattern: "Spotted",
    arrangement: "Filter chip-row over a uniform product grid; every card identical anatomy with price alignment — built for comparing.",
    heroMode: "showcase",
    sectionOrder: ["features", "stats", "voices", "story", "contact", "cta"],
    storyMode: "classic",
    featuresMode: "catalog",
    voicesMode: "grid",
    navMode: "top",
    spec: { ...BASE, container: 1200, heroPadY: [80, 56], itemGap: 24 },
    bestFor: ["restaurant", "coffee", "barbershop", "fitness", "realestate"],
    crap: {
      C: "Price line is the loudest text after the H1 — it is the payload (Spotted pattern).",
      R: "Strict card repetition: same height, same padding, same 3 text slots.",
      A: "Grid columns share edges; prices align on a common baseline per row.",
      P: "Name/desc/price grouped inside 8/12px; filter chips 12px apart.",
    },
    mobile: "Grid 3→2→1; chips scroll horizontally; comparison survives every width.",
  },
];

// ─── Lookups ──────────────────────────────────────────────────────────
export function layoutById(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function layoutsFor(archetypeId: string): Layout[] {
  const fit = LAYOUTS.filter((l) => l.bestFor.includes(archetypeId));
  return fit.length ? fit : LAYOUTS;
}

export function specSummary(l: Layout): string {
  const s = l.spec;
  return `${s.container}px · ${s.columns}col · ${s.gutter}px gutters · cards ${s.cardCols.join("/")} · pads ${s.sectionPad.join("/")}`;
}
