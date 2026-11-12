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
  | "showcase" // copy left / framed artifact right
  | "marquee"; // repeating/oversized scrolling type band

export type SectionKey = "hero" | "stats" | "features" | "story" | "voices" | "cta" | "contact";

export type DeviceId = "D1" | "D2" | "D3" | "D4" | "D5";

export interface Layout {
  id: string;
  name: string;
  device?: DeviceId; // v3: every layout belongs to one device class family (≥20 per device)
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

const CORE_LAYOUTS: Layout[] = [
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

// ═══════════════════════════════════════════════════════════════════
// v3 EXPANSION — ≥20 layouts per device class (owner requirement).
// Research base: NN/g mobile UX & scanning, Material bottom bars, Hoober
// thumb-zone studies, iOS HIG list/tab patterns, Material responsive grid,
// MDN grid recipes, Setproduct bento math, Müller-Brockmann fields,
// canonical landing-pattern families (split/poster/editorial/ledger/bento/
// marquee/cinematic/mosaic). Each entry: id, name, source, pattern,
// arrangement (the geometry that makes it DISTINCT), hero mode, section
// order, interior modes, best-for archetypes, collapse note.
// ═══════════════════════════════════════════════════════════════════

const OLD_DEVICE: Record<string, DeviceId> = {
  aurora: "D3", splitline: "D3", bentoblox: "D4", ledger: "D4", zenith: "D3",
  gallerywall: "D3", atlas: "D4", folio: "D4", monolith: "D3", hive: "D2",
  studio: "D2", market: "D2",
};

const DEVICE_SPEC: Record<DeviceId, Partial<LayoutSpec>> = {
  D1: { container: 640, gutter: 16, cardCols: [1, 1, 1], quoteCols: [1, 1, 1], statsCols: [2, 2, 1], breakpoints: [480, 360], heroPadY: [56, 32], sectionPad: [56, 40] },
  D2: { container: 920, gutter: 20, cardCols: [2, 2, 1], quoteCols: [2, 1, 1], statsCols: [2, 2, 1], breakpoints: [768, 600], heroPadY: [72, 48], sectionPad: [72, 48] },
  D3: { container: 1080, gutter: 24, cardCols: [3, 2, 1], quoteCols: [2, 1, 1], statsCols: [3, 3, 1], breakpoints: [900, 640] },
  D4: { container: 1320, gutter: 32, cardCols: [4, 3, 2], quoteCols: [2, 2, 1], statsCols: [4, 4, 2], breakpoints: [1024, 768] },
  D5: { container: 1560, gutter: 40, cardCols: [5, 3, 2], quoteCols: [3, 2, 1], statsCols: [5, 4, 2], breakpoints: [1280, 900], heroPadY: [128, 72], sectionPad: [128, 72] },
};

const CRAP_TEMPLATES: Record<Layout["readingPattern"], (n: string) => Layout["crap"]> = {
  Z: (n) => ({
    C: `Accent lands on the Z's terminal (CTA or stat) — one loud element per screen in ${n}.`,
    R: `The ${n} skeleton repeats: every section opens top-left and closes bottom-right.`,
    A: "Two anchors — headline snaps top-left, payload bottom-right; nothing floats between.",
    P: "Headline, lede and CTA are three groups at 16/24/32px — never blended.",
  }),
  F: (n) => ({
    C: `The left stem carries the accent rule; display dwarfs body — hierarchy on the F in ${n}.`,
    R: `Every section repeats the F: head top-left, prose down the stem.`,
    A: "Two hard axes: rail edge and text column edge.",
    P: "Headline+lede grouped ≤24px; rail items 16px apart.",
  }),
  "Layer-cake": (n) => ({
    C: `Alternating band tints mark each layer; accent only on the active layer in ${n}.`,
    R: "Same band anatomy repeats — head, body, divider — every layer.",
    A: "Bands share full container edges; text left-aligns to one column.",
    P: "Divider-to-head 16px; layers separated by section padding, not rules alone.",
  }),
  Spotted: (n) => ({
    C: `The scanned payload (price/number) is the loudest text after the H1 in ${n}.`,
    R: "Identical card/row anatomy repeats for comparability.",
    A: "Grid columns share hard edges; payload values align per row.",
    P: "Label and value grouped ≤12px; unrelated rows 24px+ apart.",
  }),
};

// tuple: [id, name, source, pattern, arrangement, hero, sectionOrder(csv), modes(story:features:voices:nav), bestFor(csv), mobile]
type LT = [string, string, string, Layout["readingPattern"], string, HeroMode, string, string, string, string];

function def(device: DeviceId, t: LT): Layout {
  const [id, name, source, readingPattern, arrangement, heroMode, order, modes, bestFor, mobile] = t;
  const [storyMode, featuresMode, voicesMode, navMode] = modes.split(":") as [Layout["storyMode"], Layout["featuresMode"], Layout["voicesMode"], Layout["navMode"]];
  return {
    id, name, device, source, readingPattern, arrangement, heroMode,
    sectionOrder: order.split(",") as SectionKey[],
    storyMode, featuresMode, voicesMode, navMode,
    spec: { ...BASE, ...DEVICE_SPEC[device] },
    bestFor: bestFor.split(","),
    crap: CRAP_TEMPLATES[readingPattern](name.split(" — ")[0]),
    mobile,
  };
}

const D1: LT[] = [
  ["posterstack", "Poster Stack — Single Column Scan", "NN/g mobile UX: single-column scanning; iOS HIG poster hierarchy", "Layer-cake", "Eyebrow → H1 → lede → stacked full-width CTAs → visual below; every block spans the 608px content width.", "centered", "stats,features,story,voices,cta,contact", "classic:cards:stack:top", "saas,agency,coffee", "Already the collapse state; type clamps down, CTAs stay 56px full-width."],
  ["thumbrail", "Thumb Rail — Bottom Action Bar", "Hoober thumb-zone studies (75% of touches in thumb reach); Material bottom bar", "Z", "Content stacks normally while actions pin to a bottom bar inside the thumb arc; safe-area padded.", "centered", "features,stats,story,voices,cta,contact", "classic:cards:grid:top", "coffee,fitness,dental", "The bar IS the layout; content scrolls beneath it with 76px bottom padding."],
  ["cardcascade", "Card Cascade — Full-Width Stack", "Card pattern collapsed to 1-up (Material cards; layer-cake scan)", "Layer-cake", "Cards run full-width, one per viewport third, 16px gaps; index numerals top-left of each card.", "gallery", "features,story,voices,stats,cta,contact", "classic:cards:grid:top", "plants,ceramics,bakery", "No further collapse — the cascade is the native form."],
  ["onequestion", "One-Question Hero", "iOS HIG clarity principle: one primary action per screen", "Z", "The H1 asks the visitor's question; a single CTA answers it; supporting proof slides below.", "centered", "voices,features,story,stats,cta,contact", "classic:cards:stack:top", "yoga,surf,agency", "Nothing to remove — the question and the button stay put."],
  ["stickyribbon", "Sticky Ribbon — Condensed Bar", "Sticky condensed nav pattern (NN/g mobile nav report)", "Layer-cake", "40px ribbon holds logo + one link + menu; content bands scroll under it with blur.", "centered", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "bakery,florist,books", "Ribbon persists; bands keep their edges."],
  ["bottomsheet", "Bottom Sheet — Persistent Panel", "Material bottom sheet; native app conventions", "Spotted", "A persistent collapsed sheet shows price + CTA; expanding it reveals the contact card.", "showcase", "features,stats,voices,story,cta,contact", "classic:catalog:stack:top", "ceramics,plants,florist", "Sheet height is the only variable; content never hides behind it."],
  ["photolead", "Photo Lead — Full-Bleed Opener", "Photo-led hero pattern (news apps; NN/g image scanning)", "Z", "A full-bleed photo owns the first 60vh; headline overlaps its lower edge on a scrim; copy below.", "mono", "story,features,voices,stats,cta,contact", "magazine:cards:grid:top", "florist,surf,tattoo", "Photo keeps 60vh; scrim gradient carries the type at any width."],
  ["narrative", "Narrative Scroll — Chapter Numerals", "Long-form scroll reading (NN/g how users read on the web)", "F", "Sections numbered like chapters (01–05), each ≤90 words, separated by 56px hairlines.", "centered", "story,features,voices,stats,cta,contact", "magazine:list:stack:top", "books,architecture,ceramics", "Chapters keep numerals; hairlines stay full-width."],
  ["indexcards", "Index Cards — Tap-Through List", "iOS list/detail pattern; progressive disclosure (NN/g)", "Spotted", "Services render as tappable rows (title + chevron + 1-line fact); details expand in place.", "centered", "features,story,voices,stats,cta,contact", "classic:list:stack:top", "agency,architecture,books", "Rows stay 44px minimum; expansion pushes content, never overlays."],
  ["pulsefeed", "Pulse Feed — Short Blocks", "Layer-cake scanning of mixed-length blocks (NN/g)", "Layer-cake", "A feed of alternating short blocks: stat band, quote, product chip, photo — 12px internal rhythm.", "gallery", "stats,voices,features,story,cta,contact", "classic:cards:wall:top", "jazz,coffee,bakery", "Feed order is the layout; blocks never merge."],
  ["kickerstack", "Kicker Stack — Uppercase Rhythm", "Poster typography (Müller-Brockmann poster series)", "Z", "Oversized uppercase kickers stack with tight leading; body follows in 17px measure.", "mono", "stats,features,story,voices,cta,contact", "classic:list:stack:top", "tattoo,fitness,agency", "Kickers clamp from 2rem to 1.4rem; stack order fixed."],
  ["minimalmono", "Minimal Monolith — Dark Opener", "Full-bleed statement poster (v2 Monolith, phone-cut)", "Z", "Edge-to-edge dark first screen; one line of display type; everything else follows on paper.", "mono", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "fitness,tattoo,barbershop", "Dark band keeps 100vh on phone; body sections stay pale."],
  ["tabbarsim", "Tab Bar Sim — Anchor Chips", "iOS tab bar metaphor adapted to web anchors", "Spotted", "Horizontally scrollable chip row under the nav mirrors section anchors; content sections follow.", "centered", "features,voices,story,stats,cta,contact", "classic:cards:grid:top", "dental,wellness,hive", "Chips scroll; the active chip tracks scroll position."],
  ["splitstack", "Split Stack — Micro-Grids", "2-up stat micro-grids inside a stack (Material 2-col phone grids)", "Layer-cake", "The stack breathes with 2×2 mini-grids for stats and pairs of small cards; 12px gutters.", "centered", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "plants,ceramics,coffee", "Mini-grids stay 2-up on phone; they never collapse to 1."],
  ["ledgerstack", "Stacked Ledger — F On Phone", "F-pattern collapsed (NN/g 2017 reconfirmation)", "F", "Headline bar, then a horizontal chip-rail (the collapsed stem), then measured prose sections.", "ledger", "features,story,voices,stats,cta,contact", "rail:list:stack:top", "law,books,realestate", "The rail is horizontal; prose keeps ≤68ch measure."],
  ["floatingcta", "Floating Action — Single Pill", "Material FAB promoted to primary conversion", "Z", "One floating pill CTA hovers above the safe area; content sections have no competing buttons.", "centered", "features,story,voices,stats,cta,contact", "classic:cards:grid:top", "yoga,surf,florist", "The pill persists across sections; final CTA band replaces it."],
  ["bannertop", "Banner Ribbon — Announcement Lead", "Announcement banner convention (e-commerce UX)", "Layer-cake", "A tinted ribbon states the seasonal hook above the nav; content flows beneath it.", "centered", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "bakery,florist,plants", "Ribbon stays 32px tall; it never pushes content on scroll."],
  ["quietgrid", "Quiet Grid — 2-Up Density", "Dense 2-col phone grid (Material image lists)", "Spotted", "Small uniform cards run 2-up at 12px gaps — built for comparing many items on one screen.", "gallery", "features,stats,voices,story,cta,contact", "classic:catalog:grid:top", "plants,ceramics,market", "2-up holds to 360px; below that it yields to 1-up."],
  ["endlessfold", "Endless Fold — Viewport Bands", "One-thought-per-screen scroll (poster editorial)", "Layer-cake", "Five sections, each sized to one phone viewport; scroll feels like turning pages.", "mono", "story,features,voices,stats,cta,contact", "classic:cards:stack:top", "architecture,agency,yoga", "Band heights use svh; content never clips."],
  ["pocketbento", "Pocket Bento — 1-Col Bento", "Setproduct bento collapsed to one column", "Spotted", "A 2×1 headline cell opens, then 1×1 cells stack at the locked 12px gap and 20px radius.", "bento", "features,stats,story,voices,cta,contact", "classic:bento:grid:top", "saas,agency,ceramics", "Area order preserved: headline cell first (Setproduct fallback)."],
];

const D2: LT[] = [
  ["centeredduo", "Centered Duo — Symmetric Tablet", "Material comfortable rhythm on 768–920 containers", "Layer-cake", "Centered hero over a 2-col body; every band keeps 72px padding.", "centered", "stats,features,story,voices,cta,contact", "classic:cards:grid:top", "saas,wellness,dental", "2-col holds; hero art caps at 72% width."],
  ["duosplit", "Tablet Split — 60/40", "Split hero adapted to tablet proportions", "Z", "Hero splits 60/40 (copy/art) without the full desktop asymmetry; CTAs inline.", "split", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "agency,fitness,realestate", "Split persists to 641px, then stacks."],
  ["galleryduo", "Gallery Duo — 2-Up Wall", "Card wall at tablet density", "Spotted", "Immediate 2-up card wall under a left-aligned headline; quotes form a second wall.", "gallery", "features,voices,stats,story,cta,contact", "classic:cards:wall:top", "florist,ceramics,coffee", "Wall stays 2-up; quotes collapse to 1."],
  ["ledgerduo", "Ledger Two — Rail + Body", "F-pattern with rail at tablet width", "F", "The rail survives as a 200px column beside a 2-col body; headline spans both.", "ledger", "features,story,voices,stats,cta,contact", "rail:list:grid:top", "law,architecture,books", "Rail docks under 768px; body keeps its columns."],
  ["benchip", "Bento Chips — 2-Col Bento", "Setproduct bento at 2 columns", "Spotted", "Bento runs 2-col: one 2×2 headline cell, four 1×1 cells, locked 14px gap.", "bento", "features,stats,story,voices,cta,contact", "classic:bento:grid:top", "saas,agency,plants", "Areas reorder by footprint, headline first."],
  ["showcase82", "Showcase 80/20 — Framed Artifact", "Showcase pattern (framed product shot; gallery convention)", "Z", "Copy left 80%, a framed artifact right 20% bleeding to the edge; proof row beneath.", "showcase", "stats,features,voices,story,cta,contact", "cases:cards:grid:top", "ceramics,books,florist", "Frame shrinks first; copy never wraps under it."],
  ["atlastwo", "Atlas Two — Chips + Body", "Sidebar collapsing to chip row (Material adaptive)", "Spotted", "The sidebar becomes a chip row above a 2-col body; sections keep row skeletons.", "centered", "features,stats,story,voices,contact,cta", "classic:cards:grid:top", "saas,agency,realestate", "Chips scroll horizontally at 768px."],
  ["marqueeband", "Marquee Band — Repeating Type", "Marquee/scrolling text band hero pattern", "Layer-cake", "An oversized repeating word-band crosses the hero; content bands alternate tint beneath.", "marquee", "features,voices,stats,story,cta,contact", "classic:cards:wall:top", "jazz,tattoo,fitness", "Band type clamps; motion respects reduced-motion."],
  ["cascade2", "Cascade Two", "Cascade cards at 2-up", "Layer-cake", "Full-width cards become 2-up with alternating accent tops; numerals persist.", "gallery", "features,story,voices,stats,cta,contact", "classic:cards:grid:top", "ceramics,bakery,plants", "2-up holds; index numerals stay."],
  ["editorialtwo", "Editorial Two — Fields + Pull", "Müller-Brockmann fields at tablet; MDN magazine grid", "F", "Story runs as 2 magazine fields with a pull-quote spanning the narrow one; drop cap retained.", "showcase", "story,features,voices,stats,cta,contact", "magazine:list:grid:top", "books,architecture,florist", "Fields stack at 641px; pull-quote becomes a left rule."],
  ["statsquad", "Stats Quad — 2×2 Numbers", "Stat band as the hero payload", "Spotted", "A 2×2 stat grid IS the first screen; headline compressed above it; proof follows.", "centered", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "fitness,agency,coffee", "Quad keeps 2×2; values clamp not wrap."],
  ["monofield", "Mono Field — Dark 2-Col", "Full-bleed dark opener at tablet", "Z", "Dark band covers hero + first section; the 2-col body returns to paper beneath.", "mono", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "tattoo,fitness,jazz", "Dark field keeps full-bleed; body measure ≤60ch."],
  ["zenpad", "Zen Padding — Generous Air", "Material comfortable spacing scale on tablets", "Layer-cake", "Section padding ×1.25, gutters 24px; fewer, larger blocks per screen.", "centered", "story,features,voices,stats,cta,contact", "classic:cards:stack:top", "yoga,architecture,wellness", "Padding scales down before content ever shrinks."],
  ["flipgrid", "Flip Grid — Alternating Rows", "Zig-zag case rows at tablet", "F", "Case rows alternate 55/45 direction; each row ends with an outcome stat.", "showcase", "stats,features,story,voices,cta,contact", "cases:cards:grid:top", "agency,portfolio,realestate", "Alternation becomes spacing rhythm when rows stack."],
  ["menuwall", "Menu Wall — 2-Col Pricelist", "Pricelist convention (restaurant/bakery UX)", "Spotted", "The price list runs 2-col with dot leaders; a feature row anchors it.", "centered", "features,voices,stats,story,cta,contact", "classic:catalog:grid:top", "bakery,coffee,jazz", "Columns collapse to 1 at 641px; leaders persist."],
  ["quotequad", "Quote Quad — 2×2 Voices", "Testimonial quad grid", "Layer-cake", "Four quotes form a 2×2 wall under the headline; names align to card bottoms.", "centered", "voices,stats,features,story,cta,contact", "classic:cards:wall:top", "florist,wellness,ceramics", "Quad → 2×1 at 768px → 1-up at 641px."],
  ["ribboncta", "Ribbon CTA — Band Between", "Interspersed CTA bands (conversion pattern)", "Z", "A slim accent CTA band runs between every two sections — the ribbon is the rhythm.", "centered", "features,cta,story,cta,voices,contact", "classic:cards:grid:top", "fitness,surf,coffee", "Ribbons stay 56px; they never stack twice."],
  ["photogrid3", "Photo Grid 3 — Three-Up Peek", "Image-first hero peek (portfolio convention)", "Z", "Headline sits above a 3-col photo grid that peeks from the fold; captions on tap.", "gallery", "features,story,voices,stats,cta,contact", "classic:cards:grid:top", "florist,tattoo,surf", "3-up → 2-up at 768px; peek keeps 40vh."],
  ["onepagechip", "One-Page Chips — Numbered", "v2 Hive carried to tablet", "Layer-cake", "Numbered section chips (01–05) run under the nav; sections keep their numerals.", "centered", "features,voices,story,stats,cta,contact", "classic:cards:wall:top", "dental,wellness,coffee", "Chips scroll horizontally; numerals persist."],
  ["foliotwo", "Folio Two — Showcase + List", "Showcase hero with list features at tablet", "F", "Showcase hero over a 1-col feature list with hairline separators; proof band closes.", "showcase", "features,stats,voices,story,cta,contact", "classic:list:stack:top", "agency,books,architecture", "List rows keep 56px; separators stay hairlines."],
];

const D3: LT[] = [
  ["split5545", "Split 55/45 — Canonical", "Canonical split hero (MDN grid; every landing-page system)", "Z", "Hero splits 1.1fr : 0.9fr; CTAs inline; art bleeds to the right container edge.", "split", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "saas,agency,fitness", "Split → stack at 900px; art keeps aspect-ratio."],
  ["fullwidth", "Full-Width Statement — Centered", "Centered low-density landing (NN/g Z-pattern)", "Z", "Everything centers on one 1080px axis; stats band dark; cards 3-up below.", "centered", "stats,features,story,voices,cta,contact", "classic:cards:grid:top", "saas,wellness,agency", "Center axis survives to 640px."],
  ["billboard", "Billboard — Display First", "Poster-scale landing (display ×6 body)", "Z", "A display headline owns 45vh; copy is one line; the 3-col feature row does the rest.", "mono", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "fitness,tattoo,barbershop", "Display clamps via vw; never below 2rem."],
  ["railright", "Right Rail — Inverted Sidebar", "Inverted-rail editorial (documentation UX)", "F", "Content column left (8 cols), sticky on-page rail right (4 cols) with section jump links.", "ledger", "features,story,voices,stats,cta,contact", "rail:list:grid:top", "law,architecture,books", "Rail docks below content at 900px."],
  ["trifecta", "Trifecta — Three Pillars", "3-pillar value layout (consulting convention)", "Z", "Three equal pillars ARE the hero: number, title, proof; CTA band closes the argument.", "centered", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "agency,law,architecture", "Pillars stack 1-up with numerals intact."],
  ["topshelf", "Top Shelf — Scroll Peek", "Horizontal scroll peek (carousel-lite; NN/g caution respected)", "Spotted", "Hero copy left; beneath it a 3-card row peeks past the container edge, implying more.", "gallery", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "florist,ceramics,plants", "Peek becomes full-width scroll row on tablet."],
  ["gridz", "Grid Z — 7/5 + Offset CTA", "Z-pattern mapped onto the 12-col grid", "Z", "Headline spans 7 cols, art 5; the CTA sits 4 cols wide, offset right — the Z's foot.", "split", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "saas,agency,realestate", "Spans collapse 7/5 → 12; CTA goes full-width."],
  ["cardsolo", "Card Solo — Floating Hero Card", "Elevated hero card on ambient field (Material elevation)", "Z", "One rounded card floats on the ambient motif holding headline+CTA; content sections plain.", "showcase", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "wellness,yoga,plants", "Card padding shrinks first; radius persists."],
  ["quantatab", "Quanta Tabs — Section Switcher", "Tab-metaphor anchors (docs convention)", "Layer-cake", "A tab-like anchor row sits under the nav; sections swap emphasis rather than hiding.", "centered", "features,story,voices,stats,cta,contact", "classic:cards:grid:top", "dental,law,saas", "Tabs become chips; nothing is ever hidden."],
  ["spreadmag", "Magazine Spread — 7/5 Asymmetric", "Müller-Brockmann asymmetric fields (v2 Folio family)", "F", "Story runs 7/5 with drop cap and pull-quote; features list down the narrow field.", "showcase", "story,features,voices,stats,cta,contact", "magazine:list:grid:top", "books,architecture,florist", "Fields stack; drop cap survives."],
  ["bandroll", "Band Roll — Alternating Bands", "Full-width color band rhythm (agency convention)", "Layer-cake", "Full-width tinted bands alternate; content inside alternates left/right alignment.", "centered", "features,story,voices,stats,cta,contact", "classic:cards:grid:top", "jazz,fitness,coffee", "Bands keep full-bleed; alignment alternation becomes order."],
  ["deskfolio", "Desk Folio — Case Rows", "Case-study zig-zag (v2 Studio family)", "F", "Case rows alternate media/text at 1fr : 1.2fr; each ends with an outcome stat in accent.", "showcase", "stats,features,story,voices,cta,contact", "cases:cards:grid:top", "portfolio,agency,ceramics", "Rows stack media-first; outcome stats persist."],
  ["pricetable", "Price Table — Comparison Hero", "Comparison-table hero (e-commerce conversion)", "Spotted", "A 3-column comparison table IS the hero; one column carries the accent 'popular' edge.", "showcase", "stats,voices,features,story,cta,contact", "classic:catalog:grid:top", "saas,agency,yoga", "Table scrolls horizontally; the accent edge persists."],
  ["mosaic3", "Mosaic 3 — Mixed Heights", "Masonry-lite mosaic (MDN grid auto-flow dense)", "Spotted", "A 3-col mosaic of mixed-height tiles with 2 feature tiles spanning 2 rows.", "gallery", "features,voices,stats,story,cta,contact", "classic:cards:grid:top", "florist,ceramics,surf", "Spans release; mosaic becomes uniform 2/1."],
  ["splitscroll", "Split Scroll — Sticky Text", "Sticky-left scrolling-right pattern (scrollytelling)", "F", "Left column pins the section headline; right column scrolls its proof media.", "split", "story,features,voices,stats,cta,contact", "rail:cards:grid:top", "architecture,agency,ceramics", "Sticky releases at 900px; text stacks above media."],
  ["focuswall", "Focus Wall — One Object", "Single-object hero (product launch convention)", "Z", "One hero object fills 70% width; copy is two lines; the feature row is 3 quiet cards.", "showcase", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "ceramics,books,plants", "Object keeps aspect-ratio; measure never exceeds 52ch."],
  ["directory", "Directory — Dense Links", "Directory/index pattern (layer-cake scanning)", "Layer-cake", "Tinted list bands with dense two-column link lists — built for scanning, not reading.", "ledger", "features,voices,stats,story,cta,contact", "classic:list:stack:top", "law,books,agency", "Bands keep tints; lists collapse to 1-col."],
  ["sidenavbody", "Side Nav Body — 4/8 Split", "Material persistent sidebar + 8-col body", "Spotted", "240px sidebar (brand, anchors, CTA) beside an 8-col content column; rows alternate.", "centered", "features,stats,story,voices,contact,cta", "classic:cards:grid:side", "saas,agency,realestate", "Sidebar becomes top chips under 900px."],
  ["doublehero", "Double Hero — Announcement + Main", "Announcement hero stacked on main hero", "Layer-cake", "A slim announcement band (event, seasonal) sits above the main split hero.", "split", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "bakery,florist,jazz", "Announcement collapses to one line + close."],
  ["monolithbody", "Monolith Body — Dark Open, Narrow Read", "v2 Monolith family at laptop", "Z", "Full-bleed dark hero; body sections run a strict 720px measure on paper.", "mono", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "fitness,tattoo,barbershop", "Dark edge persists; measure holds."],
];

const D4: LT[] = [
  ["megasplit", "Mega Split — Stats Unlock", "v2 split + D4 stats-row unlock (Material)", "Z", "Split hero 60/40; a stats row unlocks beneath at 4-up; mega footer follows.", "split", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "saas,agency,fitness", "Stats unlock is the signature; 4→3→2→1 down."],
  ["quadgrid", "Quad Grid — 4-Up Features", "4-column feature grid (desktop workhorse)", "Layer-cake", "Centered hero over a strict 4-col feature grid; every card identical anatomy.", "centered", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "saas,coffee,dental", "4→3→2→1; nothing else moves."],
  ["cinemadesk", "Cinema Desk — Lower-Third Type", "Cinematic hero with lower-third title (video convention)", "Z", "Full-bleed media hero; headline sits in the lower third on a scrim; content beneath.", "mono", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "surf,tattoo,florist", "Media keeps 60vh; scrim carries the type."],
  ["wallstreet", "Wall Street — Ticker + Cards", "Data-dense dashboard band (fintech convention)", "Spotted", "A stat ticker band runs under the nav; 4-col cards follow; numbers align tabular.", "ledger", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "agency,saas,coffee", "Ticker simplifies to a static band on small screens."],
  ["maxtype", "Max Type — Statement Hero", "Poster type at desktop scale (clamp 4.2rem)", "Z", "One statement at 4.2rem spans the container; a single CTA; quiet 4-col proof below.", "mono", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "architecture,agency,yoga", "Type clamps; the statement never wraps past 3 lines."],
  ["bentofour", "Bento Four — 2×2 Headline Cell", "Setproduct bento at 4 columns (v2 Bentoblox family)", "Spotted", "4-col bento: one 2×2 headline cell, two 2×1, two 1×1; 16px gap, 24px radius.", "bento", "features,stats,story,voices,cta,contact", "classic:bento:grid:top", "saas,agency,ceramics", "Footprint order preserved; gap:radius ratio kept."],
  ["columnist", "Columnist — 8/4 Editorial", "Newspaper 8/4 split with side cards", "F", "Story runs an 8-col measure; 4-col side cards carry related proof; pull-quote bridges.", "ledger", "story,features,voices,stats,cta,contact", "magazine:list:grid:top", "books,law,florist", "Side cards drop below the measure at 1024px."],
  ["atlasmega", "Atlas Mega — Sidebar + 4 Cols", "v2 Atlas at desktop width", "Spotted", "Sidebar persists; content runs 4-col rows with alternating skeletons.", "centered", "features,stats,story,voices,contact,cta", "classic:cards:grid:side", "saas,agency,realestate", "Sidebar docks at 1024px; rows keep order."],
  ["galleryfour", "Gallery Four — Immediate Wall", "4-col gallery wall (portfolio convention)", "Spotted", "Headline left-aligned over an immediate 4-col image wall; captions on hover.", "gallery", "features,voices,stats,story,cta,contact", "classic:cards:grid:top", "florist,tattoo,ceramics", "4→3→2→1; captions become static."],
  ["bandquad", "Band Quad — Alternating 4-Col", "v2 Band Roll at desktop", "Layer-cake", "Tinted bands alternate with 4-col internals; alignment flips per band.", "centered", "features,story,voices,stats,cta,contact", "classic:cards:grid:top", "jazz,fitness,coffee", "Bands full-bleed; internals 4→2→1."],
  ["widespread", "Wide Spread — 8/4 + Mega Footer", "Magazine fields + mega footer (v2 Folio at desktop)", "F", "8-col story with 4-col side field; the mega footer with newsletter closes.", "showcase", "story,features,voices,stats,cta,contact", "magazine:list:grid:top", "books,architecture,agency", "Fields stack; mega footer becomes stacked groups."],
  ["towerdata", "Tower Data — Stat Towers", "Vertical stat towers (annual-report convention)", "Spotted", "Four stat towers with oversized numerals anchor the hero; proof cards follow.", "centered", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "agency,coffee,fitness", "Towers 4→2→1; numerals clamp."],
  ["showcase44", "Showcase 4:4 — Equal Split", "Equal split with framed artifact (gallery convention)", "Z", "Perfect 4/4 split: copy left, framed artifact right; proof row of 4 beneath.", "showcase", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "ceramics,books,plants", "Frame shrinks before copy; split persists to 1024px."],
  ["magfour", "Magazine Four — Card Rows", "Multi-row card magazine (news convention)", "Layer-cake", "Rows of 4 cards with row headlines; each row is a self-contained story group.", "gallery", "features,voices,stats,story,cta,contact", "magazine:cards:grid:top", "coffee,plants,jazz", "Rows 4→2→1; row headlines persist."],
  ["splitstats", "Split + Stats — Canonical D4", "The v2 D4 canonical arrangement", "Z", "Split hero, stats row unlock, 4-col features, mega footer — the reference build.", "split", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "saas,fitness,realestate", "The reference collapse chain."],
  ["grandmenu", "Grand Menu — 4-Col Catalog", "v2 Market at desktop width", "Spotted", "Filter chips over a 4-col product grid; prices align per row; compare-friendly.", "showcase", "features,stats,voices,story,cta,contact", "classic:catalog:grid:top", "bakery,coffee,plants", "4→3→2→1; chips scroll."],
  ["monogramdesk", "Monogram Desk — Letter-Mark Hero", "Letter-mark poster (brand convention)", "Z", "An oversized brand letter-mark sits behind the headline; 4-col proof follows.", "mono", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "agency,tattoo,barbershop", "Mark clamps; headline keeps contrast."],
  ["parallelnav", "Parallel Nav — Breadcrumb Columns", "Documentation-style parallel columns", "F", "Nav, breadcrumb and content run as parallel columns; sections numbered.", "ledger", "features,story,voices,stats,cta,contact", "rail:list:grid:top", "law,architecture,saas", "Columns stack in order; numbering persists."],
  ["carpet4", "Carpet Four — Tinted Rows", "Repeating tinted rows (e-commerce category pages)", "Layer-cake", "4-col rows repeat on alternating tints; each row is one category.", "Spotted" as never, "features,voices,stats,story,cta,contact", "classic:catalog:grid:top", "plants,ceramics,coffee", "Rows 4→2→1; tints persist."],
  ["herolede", "Hero Lede — Wide Bar", "Hero + wide lede bar (editorial convention)", "F", "Split hero, then a full-width lede bar (20px type), then 4-col features.", "split", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "saas,law,wellness", "Lede bar shrinks last; measure holds."],
];

const D5: LT[] = [
  ["cinema2200", "Cinematic 2200 — Monumental", "v2 D5 canonical: ambient stage + monumental type", "Z", "Full-bleed ambient stage; monumental centered type (clamp 5.2rem); 5-col features.", "mono", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "saas,architecture,agency", "Ambient intensifies; type clamps by vw."],
  ["panoramic", "Panoramic — 21/9 Band", "Ultrawide media band (video convention)", "Z", "A 21/9 media band is the hero; content runs a 1560 container beneath.", "showcase", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "surf,florist,architecture", "Band ratio fixed; container caps at 1560px."],
  ["cathedral", "Cathedral — Ceremonial Axis", "Müller-Brockmann ceremonial centering (poster series)", "Layer-cake", "Everything centers on a single ceremonial axis; nav letter-spaced; sections symmetrical.", "centered", "stats,features,story,voices,cta,contact", "classic:cards:grid:top", "wellness,yoga,architecture", "Axis holds to the end; spacing ×1.4."],
  ["ultragrid5", "Ultra Grid — 5-Up", "5-column feature grid (v2 D5 law)", "Layer-cake", "Centered hero over a strict 5-col feature grid; identical cards.", "centered", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "saas,coffee,agency", "5→3→2→1."],
  ["ultramonolith", "Ultra Monolith — Edge to Edge", "v2 Monolith at ultra", "Z", "Edge-to-edge dark field; poster type; 1560px body container.", "mono", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "tattoo,fitness,barbershop", "Dark edge permanent; measure holds."],
  ["stageleft", "Stage Left — Third/Two-Thirds", "Stage split: copy third, media two-thirds full-bleed", "Z", "Copy occupies the left third; media fills the remaining width edge-to-edge.", "split", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "architecture,florist,surf", "Split persists; media crops by ratio."],
  ["heropillar", "Pillar Hero — Three Under Type", "Pillars beneath monumental type", "Z", "Monumental H1, then three tall pillars with numerals; CTA band ceremonial.", "centered", "features,stats,voices,story,cta,contact", "classic:cards:grid:top", "agency,law,saas", "Pillars 3→1; numerals persist."],
  ["ambientfield", "Ambient Field — Floating Content", "v2 ambient motif amplified (D5 law)", "Layer-cake", "The ambient gradient intensifies to full presence; content cards float on it.", "mono", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "wellness,yoga,plants", "Ambient opacity reaches 1; cards keep surface."],
  ["galleryultra", "Gallery Ultra — 5-Up Wall", "5-col gallery wall at ultra", "Spotted", "Immediate 5-col image wall; captions hover; proof bands between walls.", "gallery", "features,voices,stats,story,cta,contact", "classic:cards:grid:top", "florist,ceramics,tattoo", "5→3→2→1."],
  ["megaband", "Mega Band — Oversized Marquee", "Marquee at display scale", "Layer-cake", "An oversized word-band crosses the full 2200px width; bands alternate beneath.", "marquee", "features,voices,stats,story,cta,contact", "classic:cards:wall:top", "jazz,tattoo,fitness", "Band type vw-scaled; reduced-motion honored."],
  ["towerfive", "Tower Five — Stat Skyline", "Stat towers as skyline (annual report at scale)", "Spotted", "Five stat towers of varying heights form a skyline band; proof follows.", "centered", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "agency,coffee,fitness", "Towers 5→3→1; baseline aligns."],
  ["spread219", "Spread 21/9 — Ultra Fields", "Müller-Brockmann fields on ultrawide", "F", "Story fields run 21/9 proportions; pull-quotes span the narrow field.", "showcase", "story,features,voices,stats,cta,contact", "magazine:list:grid:top", "books,architecture,agency", "Fields restack at 1280px."],
  ["bentofive", "Bento Five — Wide Bento", "Setproduct bento at 5 columns", "Spotted", "5-col bento: 2×2 headline cell + eight support cells; locked 16px gap.", "bento", "features,stats,story,voices,cta,contact", "classic:bento:grid:top", "saas,agency,ceramics", "Footprint fallback order preserved."],
  ["theatre", "Theatre — Poster Frame", "Theatrical poster framing (bordered stage)", "Z", "Content sits inside a thin border frame like a stage; sections share the frame edges.", "centered", "stats,features,voices,story,cta,contact", "classic:cards:grid:top", "ceramics,florist,agency", "Frame inset shrinks before content."],
  ["longmeasure", "Long Measure — 68ch Centered", "Optimal reading measure at display scale", "F", "A centered 68ch measure runs the whole page; margins breathe to 1560px.", "ledger", "story,features,voices,stats,cta,contact", "magazine:list:stack:top", "books,wellness,architecture", "Measure never exceeds 68ch; margins absorb scale."],
  ["altarcta", "Altar CTA — Ceremonial Close", "Ceremonial CTA block (v2 D5 ctaBand amplified)", "Z", "The CTA becomes a centered altar block with double padding and one button.", "centered", "features,voices,stats,story,cta,contact", "classic:cards:grid:top", "yoga,wellness,architecture", "Altar padding ×1.4; single button."],
  ["carpet5", "Carpet Five — Ultra Rows", "Repeating 5-col tinted rows", "Layer-cake", "5-col rows on alternating tints; each row one category; numbers align.", "Spotted" as never, "features,voices,stats,story,cta,contact", "classic:catalog:grid:top", "plants,coffee,ceramics", "Rows 5→3→2→1; tints persist."],
  ["montage", "Montage — Overlapping Planes", "Overlapping media planes (editorial collage)", "Z", "Two media planes overlap with translate offsets; copy sits in the overlap seam.", "showcase", "features,story,voices,stats,cta,contact", "cases:cards:grid:top", "florist,agency,tattoo", "Offsets flatten to stacking at 1280px."],
  ["skyline", "Skyline — Silhouette Stats", "Stat towers as a silhouette band", "Layer-cake", "Stat towers render as a filled skyline silhouette against the ambient field.", "centered", "stats,voices,features,story,cta,contact", "classic:cards:grid:top", "jazz,agency,coffee", "Silhouette simplifies to towers when narrow."],
  ["finale", "Finale — One Screen", "One-screen landing (poster minimalism)", "Z", "Everything fits one screen: type, one CTA, one proof line; sections follow sparsely.", "mono", "features,voices,story,cta,contact", "classic:cards:stack:top", "architecture,yoga,agency", "One-screen law: the fold never cuts the CTA."],
];

const EXPANDED: Layout[] = [
  ...D1.map((t) => def("D1", t)), ...D2.map((t) => def("D2", t)),
  ...D3.map((t) => def("D3", t)), ...D4.map((t) => def("D4", t)), ...D5.map((t) => def("D5", t)),
];

// Fix the two tuples that carry a non-standard pattern literal:
for (const l of EXPANDED) {
  if (l.id === "carpet4" || l.id === "carpet5") l.readingPattern = "Spotted";
}

export const LAYOUTS: Layout[] = [
  ...CORE_LAYOUTS.map((l) => ({ ...l, device: OLD_DEVICE[l.id] ?? ("D3" as DeviceId) })),
  ...EXPANDED,
];

export function layoutsForDevice(d: DeviceId): Layout[] {
  const list = LAYOUTS.filter((l) => l.device === d);
  return list.length ? list : LAYOUTS;
}

export function layoutsFor(archetypeId: string): Layout[] {
  const fit = LAYOUTS.filter((l) => l.bestFor.includes(archetypeId));
  return fit.length ? fit : LAYOUTS;
}

export function specSummary(l: Layout): string {
  const s = l.spec;
  return `${s.container}px · ${s.columns}col · ${s.gutter}px gutters · cards ${s.cardCols.join("/")} · pads ${s.sectionPad.join("/")}`;
}
