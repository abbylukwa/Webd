// Beast Specification — the law book.
// Part A: DEVICE CLASSES D1–D5 (one site, five devices, five DIFFERENT relative layouts)
// Part B: infinite content grammar (niches, naming, fonts, design variants)

/* ============ PART A · DEVICE CLASSES ============ */

export type DeviceClass = {
  id: 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
  name: string;
  icon: string;
  range: string;
  previewWidth: number;
  nav: string;
  hero: string;
  featureCols: number;
  galleryCols: number;
  footer: string;
  container: string;
  gutter: string;
  typeNote: string;
  cta: string;
  extras: string[];
};

export const DEVICE_CLASSES: DeviceClass[] = [
  {
    id: 'D1', name: 'Phone', icon: '📱', range: '≤ 640px', previewWidth: 390,
    nav: 'Logo bar + hamburger → full-screen overlay drawer',
    hero: 'Poster stack: eyebrow → headline → copy → stacked CTAs → visual below',
    featureCols: 1, galleryCols: 2, footer: 'Stacked groups, tap-to-open',
    container: '100% − 2×16px', gutter: '16px',
    typeNote: 'clamp(1.9rem → 2.4rem), 1.15 line-height',
    cta: 'Full-width, 56px tall, sticky action bar allowed',
    extras: ['Bottom sticky CTA bar', 'Tap targets ≥ 44px', 'All grids collapse to 1 column'],
  },
  {
    id: 'D2', name: 'Tablet', icon: '📲', range: '641 – 1024px', previewWidth: 834,
    nav: 'Condensed bar: logo + 3 key links + CTA (rest stays in drawer)',
    hero: 'Centered composition, visual below at ~72% width',
    featureCols: 2, galleryCols: 3, footer: '2-column grid',
    container: '92% (max 920px)', gutter: '24px',
    typeNote: 'clamp(2.2rem → 3rem), scale ×1.1',
    cta: 'Inline buttons, 52px tall',
    extras: ['2-column feature grid', 'Stats appear as 2×2 wrap', 'Gallery 3-up'],
  },
  {
    id: 'D3', name: 'Laptop', icon: '💻', range: '1025 – 1440px', previewWidth: 1280,
    nav: 'Full inline nav: all links + CTA inline',
    hero: 'Split 55 / 45: text left, visual right',
    featureCols: 3, galleryCols: 4, footer: '3-column grid',
    container: 'max-width 1080px', gutter: '32px',
    typeNote: 'clamp(2.6rem → 3.6rem), scale ×1.2',
    cta: 'Inline buttons, 48px tall',
    extras: ['3-column features', 'Menu/pricing becomes 3 cards in a row', 'Sticky nav with blur'],
  },
  {
    id: 'D4', name: 'Desktop', icon: '🖥️', range: '1441 – 1920px', previewWidth: 1680,
    nav: 'Full inline nav, container-capped',
    hero: 'Split 55 / 45 + stats row unlocks beneath',
    featureCols: 4, galleryCols: 4, footer: '4-column mega footer + newsletter',
    container: 'max-width 1320px', gutter: '40px',
    typeNote: 'clamp(3rem → 4.2rem), scale ×1.35',
    cta: 'Inline buttons, 48px tall',
    extras: ['4-column features', 'Mega footer with newsletter block', 'Stats row 4-up'],
  },
  {
    id: 'D5', name: 'Ultra / TV', icon: '📺', range: '≥ 1921px', previewWidth: 2200,
    nav: 'Centered ceremonial nav, letter-spaced',
    hero: 'Cinematic full-bleed: monumental centered type over ambient stage',
    featureCols: 5, galleryCols: 4, footer: '4-column centered, ambient backdrop',
    container: 'max-width 1560px', gutter: '48px',
    typeNote: 'clamp(3.6rem → 5.2rem), scale ×1.5',
    cta: 'Large pill buttons, 52px tall',
    extras: ['Ambient background layer intensifies', '5-column features', 'Generous air: section padding ×1.4'],
  },
];

/* ============ PART B · INFINITE CONTENT GRAMMAR ============ */

export type Niche = {
  key: string;
  label: string;
  nouns: string[];       // for brand naming
  services: string[];    // 6 service/feature titles
  heroLines: string[];   // headline fragments
  about: string[];       // manifesto sentence stems
  menuTitle: string;
  menuUnit: string;
  priceBase: number;     // typical unit price
  statLabels: [string, string, string, string];
  place: string;
  quotes: [string, string];
  faq: { q: string; a: string }[]; // 2 niche-specific; 3 generic ones get appended
};

export const NICHES: Niche[] = [
  {
    key: 'coffee', label: 'coffee roastery', nouns: ['Bean', 'Roast', 'Crust', 'Ground'],
    services: ['Single-origin pour', 'Slow bar', 'Roastery tours', 'Home subscriptions', 'Wholesale beans', 'Cupping room'],
    heroLines: ['Small-batch, roasted slow.', 'Beans with a passport.', 'Wake up the good stuff.'],
    about: ['We buy green coffee direct from farms we can name', 'every batch is roasted on Thursdays and rested before it ships'],
    menuTitle: 'The coffee list', menuUnit: 'cup', priceBase: 4,
    statLabels: ['origins', 'bags a week', 'baristas', 'roasting since'],
    place: 'the old roastery lane', quotes: ['The flat white here ruined every other café for me.', 'You can taste the roast date. That says everything.'],
    faq: [
      { q: 'When do you roast?', a: 'Every Thursday morning. Bags ship or sit on the shelf within 48 hours of the roast.' },
      { q: 'Do you grind for home brew?', a: 'Yes — bring your method (V60, AeroPress, espresso) and we grind to match.' },
    ],
  },
  {
    key: 'architecture', label: 'architecture studio', nouns: ['Atelier', 'Form', 'Studio', 'Line'],
    services: ['Residential design', 'Adaptive reuse', 'Interiors', 'Feasibility studies', 'Planning & permits', '3D visualisation'],
    heroLines: ['Buildings that hold light.', 'Space, drawn with intent.', 'We design quiet landmarks.'],
    about: ['The studio works at the seam between landscape and structure', 'every project begins with how morning light enters a room'],
    menuTitle: 'Engagement stages', menuUnit: 'stage', priceBase: 1800,
    statLabels: ['built works', 'cities', 'awards', 'founded'],
    place: 'the printworks building', quotes: ['They redesigned our kitchen and the whole house started making sense.', 'Drawings so calm the council approved them first pass.'],
    faq: [
      { q: 'Do you take small projects?', a: 'Yes — we keep two small-project slots open each season for extensions and renovations.' },
      { q: 'How long is a typical project?', a: 'Feasibility to planning usually runs 3–5 months depending on the brief and the site.' },
    ],
  },
  {
    key: 'yoga', label: 'yoga atelier', nouns: ['Breath', 'Still', 'Mat', 'River'],
    services: ['Morning vinyasa', 'Yin & sound', 'Beginner courses', 'Teacher training', 'Private sessions', 'Retreats'],
    heroLines: ['Move like you mean it.', 'Strength that stays soft.', 'One hour, entirely yours.'],
    about: ['We teach alignment before ambition', 'classes are capped small so hands-on cues actually happen'],
    menuTitle: 'Class passes', menuUnit: 'pass', priceBase: 18,
    statLabels: ['classes a week', 'teachers', 'retreats a year', 'open since'],
    place: 'the courtyard studio', quotes: ['First studio where I never felt rushed out the door.', 'The yin classes fixed my sleep. Not exaggerating.'],
    faq: [
      { q: 'I have never done yoga.', a: 'Perfect. The four-week beginner course assumes zero flexibility and zero jargon.' },
      { q: 'Do I need my own mat?', a: 'Studio mats, blocks and straps are free to use — just arrive ten minutes early.' },
    ],
  },
  {
    key: 'ceramics', label: 'ceramics workshop', nouns: ['Clay', 'Kiln', 'Glaze', 'Wheel'],
    services: ['Wheel courses', 'Hand-building', 'Open studio hours', 'Member shelves', 'School visits', 'Commissions'],
    heroLines: ['Mud, made honest.', 'Objects with fingerprints.', 'Learn the wheel, keep the bowls.'],
    about: ['We fire in small kiln loads and glaze in-house from tested recipes', 'every piece that leaves here survived a maker checking the foot ring'],
    menuTitle: 'Courses & firings', menuUnit: 'course', priceBase: 65,
    statLabels: ['wheels', 'kilns', 'members', 'fired since'],
    place: 'the canal workshops', quotes: ['Six weeks in and my cupboard is full of slightly wonky, beloved bowls.', 'The open studio hours are my therapy.'],
    faq: [
      { q: 'Is there a waiting list?', a: 'Beginner courses fill about three weeks out — join the list and we email first.' },
      { q: 'What should I wear?', a: 'Clothes you can lean over clay in. Aprons and towels provided, nails short helps.' },
    ],
  },
  {
    key: 'plants', label: 'plant store', nouns: ['Leaf', 'Frond', 'Grow', 'Moss'],
    services: ['Rare aroids', 'Potting bar', 'Plant clinic', 'Repot service', 'Office greenery', 'Local delivery'],
    heroLines: ['Living things, sold kindly.', 'Green that survives you.', 'Bring the outside in.'],
    about: ['Every plant is quarantined and pest-checked before it hits the floor', 'we would rather sell you a pothos that thrives than a fiddle-leaf that dies'],
    menuTitle: 'The greenhouse', menuUnit: 'plant', priceBase: 12,
    statLabels: ['species in stock', 'rescues rehomed', 'years growing', 'est.'],
    place: 'the glasshouse row', quotes: ['Asked for something unkillable for a dark hallway. Three years on, it is thriving.', 'The plant clinic saved my monstera. Free of charge.'],
    faq: [
      { q: 'Do you deliver?', a: 'Same-week local delivery on orders over 30, plants wrapped in compostable fleece.' },
      { q: 'My plant looks sad — can I bring it in?', a: 'Yes. The clinic runs Saturdays 10–12: bring the plant or clear photos.' },
    ],
  },
  {
    key: 'jazz', label: 'jazz bar', nouns: ['Blue', 'Brass', 'Velvet', 'Note'],
    services: ['Live sets nightly', 'Listening room', 'Vinyl bar', 'Small plates', 'Private booths', 'Late sessions'],
    heroLines: ['Music you lean into.', 'Low lights, loud notes.', 'The quartet starts at nine.'],
    about: ['The room is built for listening first — no TVs, no games, no exceptions', 'we pay the musicians properly and it shows in the third set'],
    menuTitle: 'Tonight & the bar', menuUnit: 'table', priceBase: 14,
    statLabels: ['sets a week', 'seats', 'vinyl behind the bar', 'open since'],
    place: 'the cellar door', quotes: ['Heard a trumpet solo I still think about months later.', 'Date night, solved, forever.'],
    faq: [
      { q: 'Do you take bookings?', a: 'Tables for the 9pm set open Monday mornings — walk-ins squeeze in at the bar.' },
      { q: 'Is there a music charge?', a: 'Sundays are free; Friday and Saturday carry a 10 artist charge, paid to the band.' },
    ],
  },
  {
    key: 'books', label: 'bookbindery', nouns: ['Folio', 'Quill', 'Bind', 'Vellum'],
    services: ['Custom bindings', 'Book restoration', 'Journals & sketchbooks', 'Marbled papers', 'Workshops', 'Guild letters'],
    heroLines: ['Books built for decades.', 'Sewn, not glued.', 'Your shelf deserves better.'],
    about: ['We bind with linen thread and hide glue, the slow way on purpose', 'a restoration starts with a bath for the spine and ends a month later'],
    menuTitle: 'Binding services', menuUnit: 'binding', priceBase: 45,
    statLabels: ['restorations', 'bindings a year', 'years at the bench', 'est.'],
    place: 'the bindery bench', quotes: ['My grandmother\'s cookbook came back looking like it had been waiting for this.', 'They rebound my thesis. It is now the nicest object I own.'],
    faq: [
      { q: 'Can you save a broken spine?', a: 'Usually yes — send photos and we will quote a rescue, re-sewn on original cords where possible.' },
      { q: 'How long does custom work take?', a: 'Three to six weeks depending on tooling; rush slots exist for gifts and weddings.' },
    ],
  },
  {
    key: 'surf', label: 'surf school', nouns: ['Salt', 'Swell', 'Break', 'Compass'],
    services: ['Beginner lessons', 'Intermediate coaching', 'Board hire', 'Surf & stay', 'Kids camps', 'Video review'],
    heroLines: ['Salt water fixes most things.', 'Paddle out with us.', 'Waves are a language. We teach it.'],
    about: ['Groups are capped at six so the coach is in the water beside you', 'we film every session and review it over coffee after'],
    menuTitle: 'Lessons & hire', menuUnit: 'session', priceBase: 40,
    statLabels: ['lessons a year', 'coaches', 'spots we surf', 'running since'],
    place: 'the dune shack', quotes: ['Stood up on day one. Nothing has topped that feeling since.', 'The video review session was worth the whole course.'],
    faq: [
      { q: 'What do I bring?', a: 'Swimsuit and a towel. Wetsuits, boards and hot chocolate are on us.' },
      { q: 'What if the surf is flat?', a: 'We move the lesson to the estuary for paddle training, or rebook free within the season.' },
    ],
  },
  {
    key: 'bakery', label: 'neighbourhood bakery', nouns: ['Oven', 'Crumb', 'Wheat', 'Hearth'],
    services: ['Sourdough loaves', 'Morning pastries', 'Celebration cakes', 'Sandwich counter', 'Baking classes', 'Coffee beans'],
    heroLines: ['Baked before your alarm.', 'Crust you can hear.', 'The oven lights at three.'],
    about: ['Our levain is eleven years old and goes on holiday with us in a jar', 'everything is mixed by hand and proofed overnight, slow on purpose'],
    menuTitle: 'Today\u2019s bake', menuUnit: 'item', priceBase: 5,
    statLabels: ['loaves a day', 'varieties', 'flour mills', 'baking since'],
    place: 'the corner bakery', quotes: ['Queued twenty minutes for the sesame loaf. Would do it again tomorrow.', 'The cardamom knots are a public service.'],
    faq: [
      { q: 'When should I come for pastries?', a: 'Trays land at 8am sharp; cardamom knots are gone by 9:30 on weekends.' },
      { q: 'Do you take loaf pre-orders?', a: 'Yes — order by 4pm for next-morning pickup, held until noon under the counter.' },
    ],
  },
  {
    key: 'tattoo', label: 'tattoo atelier', nouns: ['Ink', 'Needle', 'Saint', 'Raven'],
    services: ['Custom pieces', 'Fine-line work', 'Black & grey', 'Cover-ups', 'Touch-ups', 'Flash days'],
    heroLines: ['Marks worth keeping.', 'Skin, considered.', 'Walk in with an idea. Leave with a story.'],
    about: ['Every piece is drawn for your body, not picked off a wall', 'the studio runs single-artist appointments so focus never splits'],
    menuTitle: 'Sessions', menuUnit: 'session', priceBase: 120,
    statLabels: ['artists', 'pieces a year', 'conventions', 'est.'],
    place: 'the quiet studio', quotes: ['Three sessions in and the sleeve is better than the drawing I brought.', 'Cleanest lines in the city. Zero ego.'],
    faq: [
      { q: 'How do I book a custom piece?', a: 'Send your idea, placement and rough size through the form — we reply with a consult slot.' },
      { q: 'Does it hurt?', a: 'Honestly: yes, differently everywhere. We pace sessions around you with breaks on request.' },
    ],
  },
  {
    key: 'florist', label: 'florist studio', nouns: ['Stem', 'Bloom', 'Thorn', 'Meadow'],
    services: ['Seasonal bouquets', 'Weddings & events', 'Weekly subscriptions', 'Dried arrangements', 'Funeral tributes', 'Workshops'],
    heroLines: ['Flowers with a point of view.', 'Arranged, not stuffed.', 'This week, in season.'],
    about: ['We buy from three farms within an hour of the city and say their names on every wrap', 'if it is not in season, it is not in the bucket'],
    menuTitle: 'This week\u2019s stems', menuUnit: 'bouquet', priceBase: 25,
    statLabels: ['local farms', 'weddings a year', 'bouquets a week', 'est.'],
    place: 'the flower corner', quotes: ['The subscription changed my whole flat\u2019s mood every Monday.', 'Our wedding flowers looked like the meadow had opinions. Perfect ones.'],
    faq: [
      { q: 'Can I order for same day?', a: 'Order by noon for same-day city delivery; bouquets are made to order, never boxed ahead.' },
      { q: 'Do you reuse vases?', a: 'Yes — return the vase and take 3 off your next order. We sterilise everything twice.' },
    ],
  },
  {
    key: 'agency', label: 'design agency', nouns: ['Signal', 'Craft', 'North', 'Field'],
    services: ['Brand identity', 'Web design & build', 'Packaging', 'Design systems', 'Motion', 'Retainers'],
    heroLines: ['Design that earns its keep.', 'Brands built slowly, shipped boldly.', 'We make the thing that makes you click.'],
    about: ['We take six clients a season, never seven', 'strategy deck before pixels, always — it is how the work stays honest'],
    menuTitle: 'Engagements', menuUnit: 'project', priceBase: 1200,
    statLabels: ['brands shipped', 'industries', 'team', 'founded'],
    place: 'the loft floor', quotes: ['They renamed us, rebuilt the site, and revenue followed within a quarter.', 'The design system paid for itself by sprint three.'],
    faq: [
      { q: 'What is your minimum engagement?', a: 'A six-week brand sprint — enough to ship identity, voice and one live surface.' },
      { q: 'Do you work with startups?', a: 'Two startup slots per season at reduced scope. Pitch us the problem, not the logo.' },
    ],
  },
];

/* ---------- naming grammar ---------- */
export const ADJECTIVES = ['Golden', 'Quiet', 'Iron', 'Velvet', 'North', 'Ember', 'Salt', 'Paper', 'Cedar', 'Moon', 'Copper', 'Amber', 'Hollow', 'Harbor', 'Sage', 'Slow', 'Wilder', 'Little'];
export const SURNAMES = ['Okafor', 'Lindqvist', 'Marlowe', 'Tanaka', 'Reyes', 'Kowalski', 'Bennett', 'Ferreira', 'Nakamura', 'Adeyemi', 'Novak', 'Castellano'];
export const CITIES = ['Ashford', 'Bellhaven', 'Kirkwall', 'PortEllen', 'Vesterby', 'Marrow Bay', 'Fernhollow', 'Old Fenwick', 'Calder', 'Riverton'];

/* ---------- typography (Google Fonts, free) ---------- */
export const HEAD_FONTS = ['Fraunces', 'Playfair Display', 'DM Serif Display', 'Space Grotesk', 'Sora', 'Unbounded', 'Bricolage Grotesque', 'Archivo Black', 'Libre Baskerville', 'Cormorant Garamond', 'Syne'];
export const BODY_FONTS = ['Inter', 'DM Sans', 'Work Sans', 'Manrope', 'Karla', 'IBM Plex Sans', 'Source Sans 3', 'Outfit', 'Newsreader', 'Space Grotesk'];

/* ---------- structural design variants ---------- */
export type HeroVariant = 'poster' | 'split' | 'cinematic' | 'editorial' | 'diagonal' | 'marquee';
export type NavVariant = 'drawer' | 'inline' | 'pill' | 'topline';
export type Motif = 'grain' | 'blobs' | 'grid' | 'rings' | 'waves' | 'dots' | 'arc';

export type DesignSpec = {
  heroVariant: HeroVariant;
  navVariant: NavVariant;
  motif: Motif;
  radius: number;
  btnRadius: number;
  spaceRhythm: 'compact' | 'cozy' | 'generous';
  sectionOrder: string[];
  eyebrow: 'dot' | 'line' | 'bracket' | 'number';
  displayCase: 'upper' | 'title' | 'lower';
  fontHead: string;
  fontBody: string;
  reveal: boolean;
  darkNav: boolean;
};

export const STAGES = [
  { key: 'brief', label: 'Brief & research', desc: 'Pick the niche, audience, naming grammar and the seed that will drive every decision.' },
  { key: 'palette', label: 'Colour & type lock', desc: 'Generate the palette by harmony math, then WCAG-correct every role until it passes.' },
  { key: 'wireframe', label: 'Wireframe D1–D5', desc: 'Sketch the relative layout for each of the five device classes before a line of markup.' },
  { key: 'build', label: 'Build & markup', desc: 'Write semantic HTML + CSS with the five structural breakpoints and fluid type.' },
  { key: 'polish', label: 'Micro-polish', desc: 'Hover states, reveal motion, focus rings, spacing rhythm, copy pass.' },
  { key: 'qa', label: 'QA · CRAP audit', desc: 'Verify Contrast / Repetition / Alignment / Proximity + every device class renders its own layout.' },
  { key: 'stamp', label: '© stamp & publish', desc: 'Inject the copyright signature, set the price, move to the for-sale shelf.' },
] as const;

export type StageKey = (typeof STAGES)[number]['key'];
