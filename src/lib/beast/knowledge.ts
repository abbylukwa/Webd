// ══════════════════════════════════════════════════════════════════════
//  THE BEAST'S EDUCATION — 12 canonical design & UX books, distilled.
//
//  This is the curriculum the Beast was raised on. Each entry holds the
//  book's real, citable core doctrine AND the machine rules the Beast
//  derived from it. The generator consults these rules at every phase
//  and cites the source book in its deliberation log.
// ══════════════════════════════════════════════════════════════════════

export interface BookLesson {
  id: string;
  title: string;
  author: string;
  year: number;
  doctrine: string[]; // what the book teaches, in the Beast's own words
  rules: string[]; // machine-applicable rules derived from it
  powers: string; // which engine phase depends on it
}

export const LIBRARY: BookLesson[] = [
  {
    id: "krug",
    title: "Don't Make Me Think",
    author: "Steve Krug",
    year: 2000,
    doctrine: [
      "Pages should be self-evident; if they can't be, they must be self-explanatory.",
      "People don't read pages — they scan them. Design for the glance.",
      "Conventions are your friends: put things where users already expect them.",
      "Omit words. Half the words is usually fine, half of that even better.",
    ],
    rules: [
      "NAV: logo left, 4–6 links max, one unmissable call-to-action button.",
      "HERO: headline states the offer in plain language, no cleverness.",
      "SCAN: every section gets a 6–12 word scannable sub-headline.",
      "COPY: ruthless cut — sentences under 20 words, paragraphs under 3.",
    ],
    powers: "Copywriting & navigation phases",
  },
  {
    id: "norman",
    title: "The Design of Everyday Things",
    author: "Don Norman",
    year: 1988,
    doctrine: [
      "Affordances are the possible actions; signifiers must make them visible.",
      "Feedback: every action needs an immediate, perceivable response.",
      "Constraints guide people toward the correct action.",
      "A good conceptual model makes the obvious work and the rest discoverable.",
    ],
    rules: [
      "BUTTONS: every clickable element gets hover, focus and active states.",
      "LINKS: underlined or visibly button-shaped — never color alone.",
      "FORMS: labels above fields, one clear primary action per form.",
      "STATE: active nav item is visibly distinct from inactive items.",
    ],
    powers: "Construction & audit phases",
  },
  {
    id: "refactoring-ui",
    title: "Refactoring UI",
    author: "Adam Wathan & Steve Schoger",
    year: 2018,
    doctrine: [
      "Design with tactics, not talent.",
      "Hierarchy is everything: size, weight and color beat position alone.",
      "Don't use grey text on colored backgrounds — shift hue and lightness instead.",
      "Work with a system: define scales for space, type, color and shadow once.",
      "Fewer borders: separate with space and background shifts first.",
    ],
    rules: [
      "SCALE: type scale locked at 1.25 ratio; never more than 6 sizes per page.",
      "SPACE: 8px base grid; section padding 96px desktop / 56px mobile.",
      "TEXT: body text never lighter than #444 on light backgrounds.",
      "DEPTH: shadows for elevation, borders only where space can't separate.",
      "PERSONALITY: font choice + radius + palette must match the brand mood.",
    ],
    powers: "Palette, typography & construction phases",
  },
  {
    id: "garrett",
    title: "The Elements of User Experience",
    author: "Jesse James Garrett",
    year: 2002,
    doctrine: [
      "Five planes, bottom to top: Strategy, Scope, Structure, Skeleton, Surface.",
      "User needs first, then site objectives — never the reverse.",
      "Each plane must be finished before the next can be decided confidently.",
      "The surface is sensory, but it must express the strategy beneath.",
    ],
    rules: [
      "STRATEGY: every commission starts with a written one-line brief.",
      "SCOPE: section list is fixed before any visual work begins.",
      "ORDER: decisions cascade — audience → purpose → sections → layout → skin.",
    ],
    powers: "Research & strategy phases",
  },
  {
    id: "brockmann",
    title: "Grid Systems in Graphic Design",
    author: "Josef Müller-Brockmann",
    year: 1961,
    doctrine: [
      "The grid is an expression of intellectual order — clarity, not constraint.",
      "A mathematical grid makes decisions objective and repeatable.",
      "White space is an active element, not leftover emptiness.",
    ],
    rules: [
      "GRID: 12-column grid, 1140px max container, 24px gutters.",
      "ALIGN: every element snaps to a column edge or the center axis.",
      "ASYMMETRY: alternate text-left / text-right sections for rhythm.",
    ],
    powers: "Grid & wireframe phase",
  },
  {
    id: "lupton",
    title: "Thinking with Type",
    author: "Ellen Lupton",
    year: 2004,
    doctrine: [
      "Typography is what language looks like — treat it as design material.",
      "Letter, Text, Grid: master each scale before the next.",
      "Line length 45–75 characters; leading about 1.4–1.5× the size.",
      "Pair typefaces with contrast in structure, harmony in mood.",
    ],
    rules: [
      "PAIR: exactly two families per site — one display, one workhorse.",
      "MEASURE: body copy 60–72ch max-width; line-height 1.55–1.7.",
      "HIERARCHY: display sizes carry the page; body stays quiet.",
    ],
    powers: "Typography phase",
  },
  {
    id: "albers",
    title: "Interaction of Color",
    author: "Josef Albers",
    year: 1963,
    doctrine: [
      "There are no absolutes in color — context changes everything.",
      "A color next to another reads differently than it does alone.",
      "Study color through tests and comparison, never assumption.",
      "Contrast of hue, light and saturation must be managed separately.",
    ],
    rules: [
      "TEST: every text/background pair is measured, not eyeballed.",
      "AA: body text ≥ 4.5:1 contrast; large display text ≥ 3:1.",
      "ACCENT: one dominant accent used for ≤ 10% of the surface.",
      "NEIGHBORS: palette colors must stay distinguishable when adjacent.",
    ],
    powers: "Palette phase & C.R.A.P. audit",
  },
  {
    id: "williams",
    title: "The Non-Designer's Design Book",
    author: "Robin Williams",
    year: 1994,
    doctrine: [
      "C.R.A.P.: Contrast, Repetition, Alignment, Proximity.",
      "Contrast: if two things differ, make them very different.",
      "Repetition: repeat visual elements to unify the whole.",
      "Alignment: nothing is placed arbitrarily; everything relates.",
      "Proximity: related things sit together, unrelated things apart.",
    ],
    rules: [
      "This book is the audit itself — the Beast grades every site on C, R, A, P before shipping.",
      "Contrast rule: every ink/background pair is measured, never eyeballed — ink ≥ 7:1, soft ink ≥ 4.5:1, accent ≥ 3:1, text-on-accent ≥ 4.5:1 (WCAG maths).",
      "Repetition rule: one spacing scale, one type scale, tokenised colour roles — the same values repeat across every section, every device class, every site.",
      "Alignment rule: all content sits on the container grid of its device class (D1–D5); nothing is nudged by eye, no magic offsets.",
      "Proximity rule: related blocks group at itemGap, sections breathe at sectionPad — spacing is a fixed multiple of the scale, and it is the same multiple everywhere.",
    ],
    powers: "The C.R.A.P. audit phase",
  },
  {
    id: "tidwell",
    title: "Designing Interfaces",
    author: "Jenifer Tidwell",
    year: 2005,
    doctrine: [
      "Patterns are reusable solutions to recurring design problems.",
      "Know the context: who is the audience and what are they trying to do?",
      "Proven structures beat invented ones for common jobs.",
    ],
    rules: [
      "HERO: pick a proven hero pattern — centered statement, split, or visual showcase.",
      "PROOF: social proof (testimonials, numbers) always before the final CTA.",
      "CARDS: feature lists become cards of 3 or 6, never 4 or 5.",
    ],
    powers: "Grid & wireframe phase",
  },
  {
    id: "upod",
    title: "Universal Principles of Design",
    author: "Lidwell, Holden & Butler",
    year: 2003,
    doctrine: [
      "125 principles from Ockham's Razor to the Golden Ratio — the shared grammar of good design.",
      "Hick's Law: more choices, longer decisions — cut options.",
      "The F-pattern: users scan top-left heavy — put the payload there.",
      "Form follows function; ornaments must earn their place.",
    ],
    rules: [
      "CTA: exactly one primary action visible per viewport.",
      "F-PATTERN: key value proposition in the top-left third of the hero.",
      "CUT: if a section doesn't serve the one-line brief, it's deleted.",
    ],
    powers: "Strategy, polish & audit phases",
  },
  {
    id: "kleon",
    title: "Steal Like an Artist",
    author: "Austin Kleon",
    year: 2012,
    doctrine: [
      "Nothing is original — remix the best of what came before.",
      "Collect good ideas; the more you take in, the more you can recombine.",
      "Side projects and deliberate study feed the main work.",
    ],
    rules: [
      "REMIX: each site recombines proven patterns in a new way — never one template stamped twice.",
      "STUDY: the Beast keeps a log of what each palette/pattern was 'stolen' from.",
    ],
    powers: "Concept phase",
  },
  {
    id: "unger",
    title: "A Project Guide to UX Design",
    author: "Russ Unger & Carolyn Chandler",
    year: 2009,
    doctrine: [
      "Research before design: know the business, the users, the constraints.",
      "A project is a series of deliberate phases, not one big push.",
      "Document decisions as you make them — future-you needs the paper trail.",
    ],
    rules: [
      "BRIEF: every job opens with a field-study note (audience, goal, feel).",
      "PHASES: work proceeds in named phases with exits, never all at once.",
      "LOG: every decision is written down with its reason. No silent choices.",
    ],
    powers: "Research phase & the deliberation log itself",
  },
];

// ─── The Beast's phase machine — "taking its time" is a feature ───────
// A site crosses 11 deliberate phases. Durations are in beast-minutes;
// the pace setting converts real time into beast-time.

export interface Phase {
  key: string;
  label: string;
  minutes: number;
  book: string; // library id steering this phase
  verb: string; // shown in the live feed while working
}

export const PHASES: Phase[] = [
  { key: "research", label: "Field Study", minutes: 45, book: "unger", verb: "Studying the brief, audience and competitors" },
  { key: "strategy", label: "Strategy Plane", minutes: 45, book: "garrett", verb: "Writing the one-line strategy brief" },
  { key: "concept", label: "Concept & Moodboard", minutes: 60, book: "kleon", verb: "Collecting references to steal from — respectfully" },
  { key: "palette", label: "Color Studies", minutes: 60, book: "albers", verb: "Testing palettes side by side, measuring contrast" },
  { key: "type", label: "Type Specimen", minutes: 60, book: "lupton", verb: "Auditioning typeface pairings at real sizes" },
  { key: "grid", label: "Grid & Wireframe", minutes: 90, book: "brockmann", verb: "Snapping sections onto a 12-column grid" },
  { key: "copy", label: "Voice & Copywriting", minutes: 90, book: "krug", verb: "Writing, then cutting the copy in half" },
  { key: "build", label: "Construction", minutes: 180, book: "refactoring-ui", verb: "Building components on the spacing system" },
  { key: "incubate", label: "Sleeping On It", minutes: 120, book: "kleon", verb: "Deliberately stepping away. Looking again with fresh eyes" },
  { key: "audit", label: "C.R.A.P. Audit", minutes: 60, book: "williams", verb: "Grading Contrast, Repetition, Alignment, Proximity" },
  { key: "polish", label: "The Last 2%", minutes: 90, book: "upod", verb: "Ockham's Razor pass — earning every ornament" },
];

export const TOTAL_MINUTES = PHASES.reduce((s, p) => s + p.minutes, 0); // 900 = 15 beast-hours
