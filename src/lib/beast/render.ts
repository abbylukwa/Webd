// Beast Site Renderer — turns a seed into a complete, standalone, handcrafted-feeling
// website. One site, five device classes, five DIFFERENT relative layouts:
//   D1 phone  ≤640    — 1-col stack, drawer nav, poster hero, sticky CTA bar
//   D2 tablet 641–1024 — 2-col grids, condensed nav, centered hero
//   D3 laptop 1025–1440 — 3-col, inline nav, split hero 55/45
//   D4 desktop 1441–1920 — 4-col, capped container, stats row, mega footer
//   D5 ultra  ≥1921   — 5-col, cinematic monumental hero, ambient stage
// Relative units everywhere: %, fr, clamp(), rem, aspect-ratio — no fixed px widths.
import { seedFrom, type RNG } from './rng';
import { buildPalette, type Palette } from './palette';
import {
  ADJECTIVES, BODY_FONTS, CITIES, DEVICE_CLASSES, HEAD_FONTS, NICHES, SURNAMES,
  type DesignSpec, type HeroVariant, type Motif, type NavVariant, type Niche,
} from './spec';

export type RenderedSite = {
  brand: string;
  niche: Niche;
  city: string;
  design: DesignSpec;
  palette: Palette;
  html: string;
  email: string;
  phone: string;
};

/* ---------- design spec from seed ---------- */
export function designFromSeed(seed: string): { rng: RNG; niche: Niche; brand: string; city: string; design: DesignSpec; palette: Palette } {
  const rng = seedFrom(seed);
  const niche = rng.pick(NICHES);
  const city = rng.pick(CITIES);

  // naming grammar
  const pattern = rng.pick(['theAdjNoun', 'compound', 'surname', 'plainNoun'] as const);
  const adj = rng.pick(ADJECTIVES);
  const noun = rng.pick(niche.nouns);
  const brand =
    pattern === 'theAdjNoun' ? `The ${adj} ${noun}`
    : pattern === 'compound' ? `${adj}${noun}`
    : pattern === 'surname' ? `${rng.pick(SURNAMES)}'s ${niche.label.split(' ')[0].replace(/^\w/, (c) => c.toUpperCase())}`
    : `${noun} & ${rng.pick(ADJECTIVES)}`;

  const palette = buildPalette(rng);
  const design: DesignSpec = {
    heroVariant: rng.pick(['poster', 'split', 'cinematic', 'editorial', 'diagonal', 'marquee'] as HeroVariant[]),
    navVariant: rng.pick(['drawer', 'inline', 'pill', 'topline'] as NavVariant[]),
    motif: rng.pick(['grain', 'blobs', 'grid', 'rings', 'waves', 'dots', 'arc'] as Motif[]),
    radius: rng.pick([0, 2, 4, 8, 12, 16, 20]),
    btnRadius: rng.pick([0, 4, 8, 999]),
    spaceRhythm: rng.pick(['compact', 'cozy', 'generous'] as const),
    sectionOrder: [],
    eyebrow: rng.pick(['dot', 'line', 'bracket', 'number'] as const),
    displayCase: rng.pick(['upper', 'title', 'lower'] as const),
    fontHead: (function(){ const fh = rng.pick(HEAD_FONTS); return fh; })(),
    fontBody: rng.pick(BODY_FONTS),
    reveal: rng.chance(0.8),
    darkNav: palette.theme === 'dark' ? rng.chance(0.5) : rng.chance(0.15),
  };
  return { rng, niche, brand, city, design, palette };
}

/* ---------- css ---------- */
function motifCss(motif: Motif, p: Palette): string {
  switch (motif) {
    case 'grain': return `.ambient{opacity:.5;background-image:radial-gradient(${p.border} .8px,transparent .8px),radial-gradient(${p.border} .8px,transparent .8px);background-size:22px 22px,22px 22px;background-position:0 0,11px 11px;}`;
    case 'blobs': return `.ambient{opacity:.6;background:radial-gradient(600px 400px at 12% 8%,${p.accent}22,transparent 60%),radial-gradient(700px 500px at 88% 20%,${p.accent2}1e,transparent 65%),radial-gradient(500px 600px at 50% 100%,${p.accent}14,transparent 60%);}`;
    case 'grid': return `.ambient{opacity:.45;background-image:linear-gradient(${p.border} 1px,transparent 1px),linear-gradient(90deg,${p.border} 1px,transparent 1px);background-size:56px 56px;}`;
    case 'rings': return `.ambient{opacity:.5;background:repeating-radial-gradient(circle at 85% 10%,transparent 0 46px,${p.border} 46px 47px);}`;
    case 'waves': return `.ambient{opacity:.5;background:repeating-linear-gradient(115deg,transparent 0 38px,${p.border} 38px 39px);}`;
    case 'dots': return `.ambient{opacity:.55;background-image:radial-gradient(${p.inkSoft}55 1.2px,transparent 1.2px);background-size:26px 26px;}`;
    default: return `.ambient{opacity:.5;background:radial-gradient(120% 90% at 50% -20%,transparent 60%,${p.accent}18 100%);}`;
  }
}

function buildCss(p: Palette, d: DesignSpec, niche: Niche): string {
  const sp = d.spaceRhythm === 'compact' ? 64 : d.spaceRhythm === 'cozy' ? 88 : 112;
  const headCase = d.displayCase === 'upper' ? 'uppercase' : d.displayCase === 'lower' ? 'lowercase' : 'none';
  const navBg = d.darkNav ? p.ink : p.bg;
  const navInk = d.darkNav ? p.bg : p.ink;
  const heroMap: Record<HeroVariant, string> = {
    poster: '1fr', split: '1fr', cinematic: '1fr', editorial: '1fr', diagonal: '1fr', marquee: '1fr',
  };
  return `
:root{
  --bg:${p.bg};--bgAlt:${p.bgAlt};--surface:${p.surface};--ink:${p.ink};--inkSoft:${p.inkSoft};
  --accent:${p.accent};--accent2:${p.accent2};--onAccent:${p.inkOnAccent};--border:${p.border};
  --navBg:${navBg};--navInk:${navInk};
  --fh:'${d.fontHead}',serif;--fb:'${d.fontBody}',sans-serif;
  --radius:${d.radius}px;--btnR:${d.btnRadius === 999 ? '999px' : d.btnRadius + 'px'};
  --container:100%;--gut:16px;--spSec:${sp * 0.6}px;--fx:1;
  --heroCols:${heroMap[d.heroVariant]};
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font-family:var(--fb);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img,svg{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:2px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
.ambient{position:fixed;inset:0;z-index:-1;pointer-events:none}
.wrap{width:var(--container);margin-inline:auto;padding-inline:var(--gut)}
section{padding-block:var(--spSec)}
h1,h2,h3{font-family:var(--fh);line-height:1.08;letter-spacing:-.01em}
h1{font-size:clamp(1.9rem,6vw,calc(2.4rem*var(--fx)));text-transform:${headCase};font-weight:700}
h2{font-size:clamp(1.5rem,3.6vw,calc(2.2rem*var(--fx)));text-transform:${headCase};font-weight:600}
h3{font-size:clamp(1.05rem,2vw,calc(1.3rem*var(--fx)));font-weight:600}
.kicker{display:inline-flex;align-items:center;gap:8px;color:var(--accent);font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:.72rem;margin-bottom:14px}
.kicker .kd{width:8px;height:8px;background:var(--accent);border-radius:50%}
.kicker.kline::before{content:'';width:28px;height:2px;background:var(--accent)}
.kicker.kbrack::before{content:'[';color:var(--accent);font-weight:700}.kicker.kbrack::after{content:']';color:var(--accent);font-weight:700}
.knumber{color:var(--inkSoft);font-variant-numeric:tabular-nums;margin-right:2px}
.lead{color:var(--inkSoft);font-size:clamp(1rem,1.6vw,1.15rem);max-width:56ch}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:56px;padding:12px 24px;border-radius:var(--btnR);font-weight:700;font-size:.95rem;border:2px solid transparent;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
.btn:active{transform:translateY(1px)}
.btnFill{background:var(--accent);color:var(--onAccent)}
.btnFill:hover{box-shadow:0 10px 24px -10px ${p.accent}88;transform:translateY(-1px)}
.btnGhost{border-color:var(--ink);color:var(--ink);background:transparent}
.btnGhost:hover{background:${p.ink}0d}
/* NAV — D1: drawer */
.nav{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--navBg) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid ${d.darkNav ? 'transparent' : 'var(--border)'}}
.navIn{display:flex;align-items:center;justify-content:space-between;min-height:64px;gap:16px}
.logo{font-family:var(--fh);font-weight:700;font-size:1.15rem;color:var(--navInk);display:flex;align-items:center;gap:10px}
.logoDot{width:12px;height:12px;border-radius:50%;background:var(--accent);flex:none}
.navLinks{display:none;gap:26px;list-style:none}
.navLinks a{color:var(--navInk);opacity:.8;font-size:.92rem;font-weight:600}
.navLinks a:hover{opacity:1}
.navCta{display:none}
.burger{display:inline-flex;flex-direction:column;gap:5px;background:none;border:0;padding:10px;min-width:44px;min-height:44px;cursor:pointer}
.burger span{width:22px;height:2px;background:var(--navInk);transition:.25s}
.drawer{position:fixed;inset:0;z-index:60;background:var(--bg);display:flex;flex-direction:column;padding:24px;transform:translateY(-100%);transition:transform .32s cubic-bezier(.2,.8,.2,1)}
.drawer.open{transform:translateY(0)}
.drawerTop{display:flex;justify-content:space-between;align-items:center}
.drawer a.dl{font-family:var(--fh);font-size:1.9rem;padding:14px 0;border-bottom:1px solid var(--border);color:var(--ink)}
.drawer .btn{margin-top:auto}
/* sections */
.secHead{margin-bottom:34px;display:flex;flex-direction:column;gap:10px}
.gridFeat{display:grid;grid-template-columns:1fr;gap:14px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px;transition:transform .2s ease,box-shadow .2s ease}
.card:hover{transform:translateY(-3px);box-shadow:0 18px 40px -22px ${p.ink}55}
.card .cnum{font-variant-numeric:tabular-nums;color:var(--accent);font-weight:800;font-size:.8rem;letter-spacing:.1em}
.card p{color:var(--inkSoft);font-size:.95rem;margin-top:8px}
.gridGal{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.tile{aspect-ratio:4/3;border-radius:var(--radius);position:relative;overflow:hidden;display:flex;align-items:flex-end;padding:14px;color:#fff;font-weight:700;text-shadow:0 1px 8px rgba(0,0,0,.35)}
.tile span{position:relative;z-index:1;font-size:.85rem;letter-spacing:.04em}
.gridStats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.stat{border-top:2px solid var(--accent);padding-top:10px}
.stat b{font-family:var(--fh);font-size:clamp(1.6rem,4vw,2.4rem);display:block;line-height:1}
.stat span{color:var(--inkSoft);font-size:.85rem}
.menuList{display:grid;gap:10px}
.menuRow{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:14px 0;border-bottom:1px dashed var(--border)}
.menuRow b{font-family:var(--fh);font-weight:600}
.menuRow i{font-style:normal;color:var(--accent);font-weight:700;white-space:nowrap}
.menuRow small{display:block;color:var(--inkSoft);font-size:.85rem}
.quotes{display:grid;gap:14px}
.quote{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:var(--radius);padding:20px}
.quote p{font-family:var(--fh);font-size:1.05rem;line-height:1.5}
.quote footer{margin-top:10px;color:var(--inkSoft);font-size:.85rem}
.faq details{border-bottom:1px solid var(--border)}
.faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 0;font-weight:600;min-height:44px}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:'+';font-size:1.4rem;color:var(--accent);transition:transform .2s}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq .fa{color:var(--inkSoft);padding-bottom:18px;max-width:62ch}
.ctaBand{background:var(--accent);color:var(--onAccent);border-radius:var(--radius);padding:40px 24px;text-align:center}
.ctaBand h2{margin-bottom:10px}
.ctaBand .btn{background:var(--onAccent);color:var(--accent)}
.aboutCols{display:grid;gap:18px}
.pull{font-family:var(--fh);font-size:clamp(1.2rem,2.4vw,1.6rem);line-height:1.35;border-left:3px solid var(--accent);padding-left:18px}
.contactCols{display:grid;gap:16px}
.cbox h3{margin-bottom:8px}
.cbox p,.cbox li{color:var(--inkSoft);font-size:.95rem}
.cbox ul{list-style:none;display:grid;gap:6px}
/* footer */
footer.site{border-top:1px solid var(--border);padding:40px 0 calc(28px + env(safe-area-inset-bottom));background:var(--bgAlt)}
.footCols{display:grid;grid-template-columns:1fr;gap:24px}
.footCols h4{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--inkSoft);margin-bottom:10px}
.footCols ul{list-style:none;display:grid;gap:8px;font-size:.92rem}
.footCols a:hover{color:var(--accent)}
.mega-only{display:none}
.copy{margin-top:28px;padding-top:18px;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;color:var(--inkSoft);font-size:.82rem}
.copy .stamp{font-variant-numeric:tabular-nums}
/* D1 extras */
.mbar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;gap:10px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px);border-top:1px solid var(--border)}
.mbar .btn{flex:1;min-height:48px}
body{padding-bottom:76px}
.hero{padding-block:calc(var(--spSec)*.8) var(--spSec)}
.heroWrap{display:grid;grid-template-columns:var(--heroCols);gap:26px;align-items:center}
.heroWrap .hcopy{display:flex;flex-direction:column;align-items:flex-start;gap:16px}
.heroWrap .hcopy p{max-width:52ch}
.heroWrap .hbtns{display:flex;flex-direction:column;gap:10px;width:100%}
.heroWrap .hbtns .btn{width:100%}
.hvisual{aspect-ratio:4/3;border-radius:var(--radius);position:relative;overflow:hidden}
.hvisual::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(0,0,0,.18))}
.heroBadge{position:absolute;top:12px;left:12px;background:rgba(255,255,255,.92);color:#111;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:6px 10px;border-radius:999px}
.reveal{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.8,.2,1)}
.reveal.in{opacity:1;transform:none}
/* ============ D2 · tablet 641–1024 ============ */
@media (min-width:641px){
  :root{--gut:24px;--spSec:${sp * 0.8}px;--fx:1.1;--container:92%}
  .wrap{max-width:920px}
  .burger{display:none}
  .navLinks{display:flex}
  .navLinks li.hideD2{display:none}
  .navCta{display:inline-flex;min-height:44px}
  .gridFeat{grid-template-columns:repeat(2,1fr);gap:18px}
  .gridGal{grid-template-columns:repeat(3,1fr);gap:14px}
  .gridStats{grid-template-columns:repeat(4,1fr)}
  .menuList{grid-template-columns:1fr 1fr;column-gap:32px}
  .quotes{grid-template-columns:1fr 1fr}
  .footCols{grid-template-columns:repeat(2,1fr)}
  .heroWrap{justify-items:center;text-align:center}
  .heroWrap .hcopy{align-items:center}
  .heroWrap .hbtns{flex-direction:row;width:auto}
  .heroWrap .hbtns .btn{width:auto}
  .hvisual{width:72%}
  body{padding-bottom:0}
  .mbar{display:none}
}
/* ============ D3 · laptop 1025–1440 ============ */
@media (min-width:1025px){
  :root{--gut:32px;--spSec:${sp}px;--fx:1.2;--container:1080px}
  .navLinks li.hideD2{display:list-item}
  .gridFeat{grid-template-columns:repeat(3,1fr)}
  .gridGal{grid-template-columns:repeat(4,1fr)}
  .menuList{grid-template-columns:repeat(3,1fr)}
  .quotes{grid-template-columns:repeat(2,1fr)}
  .footCols{grid-template-columns:2fr 1fr 1fr 1fr}
  body[data-hero="split"] .heroWrap,body[data-hero="marquee"] .heroWrap,body[data-hero="diagonal"] .heroWrap{grid-template-columns:55fr 45fr;justify-items:start;text-align:left}
  body[data-hero="split"] .heroWrap .hcopy,body[data-hero="marquee"] .heroWrap .hcopy,body[data-hero="diagonal"] .heroWrap .hcopy{align-items:flex-start}
  body[data-hero="split"] .hvisual,body[data-hero="marquee"] .hvisual,body[data-hero="diagonal"] .hvisual{width:100%;aspect-ratio:1/1}
  body[data-hero="editorial"] .heroWrap{grid-template-columns:1fr;justify-items:start;text-align:left}
  .aboutCols{grid-template-columns:1.2fr .8fr}
  .contactCols{grid-template-columns:repeat(3,1fr)}
  .ctaBand{padding:56px 48px}
}
/* ============ D4 · desktop 1441–1920 ============ */
@media (min-width:1441px){
  :root{--gut:40px;--spSec:${sp * 1.15}px;--fx:1.35;--container:1320px}
  .gridFeat{grid-template-columns:repeat(4,1fr)}
  .mega-only{display:block}
  .footCols{grid-template-columns:2fr 1fr 1fr 1.4fr}
  .stats-unlock{display:grid!important}
  .stat{border-top-width:3px}
}
/* ============ D5 · ultra/TV ≥1921 ============ */
@media (min-width:1921px){
  :root{--gut:48px;--spSec:${sp * 1.4}px;--fx:1.5;--container:1560px}
  .gridFeat{grid-template-columns:repeat(5,1fr)}
  .navIn{justify-content:center;gap:56px}
  .navLinks{gap:34px}
  .navLinks a{letter-spacing:.06em;text-transform:uppercase;font-size:.8rem}
  body[data-hero] .heroWrap{grid-template-columns:1fr;justify-items:center;text-align:center;padding-block:40px}
  body[data-hero] .heroWrap .hcopy{align-items:center}
  body[data-hero] .hvisual{width:min(880px,72%);aspect-ratio:21/9}
  h1{font-size:clamp(3.6rem,4.5vw,5.2rem)}
  .ambient{opacity:1}
  .ctaBand{padding:88px 96px}
  .footCols{text-align:center}
  .footCols ul{justify-items:center}
}
.stats-unlock{display:none}
`.replace(/\n/g, '\n');
}

/* ---------- copy helpers ---------- */
function money(v: number): string {
  return v % 1 === 0 ? `$${v}` : `$${v.toFixed(2)}`;
}

function brandSlug(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.site';
}

/* ---------- render ---------- */
export function renderSite(seed: string, owner: string): RenderedSite {
  const { rng, niche, brand, city, design, palette } = designFromSeed(seed);
  const year = new Date().getFullYear();
  const email = `hello@${brandSlug(brand)}`;
  const phone = `+1 (${rng.int(200, 989)}) ${rng.int(200, 989)}-${rng.int(1000, 9999)}`;

  // section order: hero first; pick 6 middles; cta before footer
  const pool = rng.shuffle(['about', 'services', 'gallery', 'menu', 'testimonials', 'stats', 'faq', 'contact']);
  const middles = pool.slice(0, 6);
  if (!middles.includes('contact')) middles[middles.length - 1] = 'contact';
  design.sectionOrder = ['hero', ...middles.slice(0, 5), 'cta'];

  const navAnchors = design.sectionOrder
    .filter((s) => !['hero', 'cta'].includes(s))
    .map((s) => ({ id: s, label: s === 'services' ? 'Services' : s === 'gallery' ? 'Work' : s === 'menu' ? niche.menuTitle.split(' ')[0] : s === 'testimonials' ? 'Reviews' : s === 'stats' ? 'Numbers' : s === 'faq' ? 'FAQ' : s === 'about' ? 'About' : 'Visit' }));

  const headline = rng.pick(niche.heroLines);
  const sub = `${rng.pick(niche.about)}, and we do it in ${city} — ${niche.label} for people who notice the details.`;
  const heroTag = rng.pick(['Since day one', 'By appointment', 'Walk-ins welcome', 'Est. ' + rng.int(1998, 2021)]);

  // visual gradients for hero + tiles
  const grads = [
    `linear-gradient(135deg,${palette.accent},${palette.accent2})`,
    `linear-gradient(24deg,${palette.accent2},${palette.ink})`,
    `radial-gradient(circle at 30% 30%,${palette.accent},${palette.ink})`,
    `linear-gradient(160deg,${palette.accent} 10%,${palette.bgAlt} 90%)`,
  ];

  const secHtml: Record<string, string> = {};

  secHtml['hero'] = `
  <section class="hero" id="top"><div class="wrap heroWrap">
    <div class="hcopy reveal">
      <span class="kicker k${design.eyebrow === 'line' ? 'line' : design.eyebrow === 'brack' ? 'brack' : ''}">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}${design.eyebrow === 'number' ? `<span class="knumber">01</span>` : ''}${heroTag}</span>
      <h1>${headline}</h1>
      <p class="lead">${sub}</p>
      <div class="hbtns">
        <a class="btn btnFill" href="#contact">${rng.pick(['Book a visit', 'Get started', 'Say hello', 'Reserve yours'])}</a>
        <a class="btn btnGhost" href="#${navAnchors[0]?.id ?? 'about'}">See the ${niche.label.split(' ')[0]}</a>
      </div>
    </div>
    <div class="hvisual reveal" style="background:${grads[0]}">
      <span class="heroBadge">${brand}</span>
    </div>
  </div></section>`;

  secHtml['about'] = `
  <section id="about"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}The idea</span><h2>${rng.pick(['Why we exist', 'The slow way, on purpose', 'What we believe'])}</h2></div>
    <div class="aboutCols">
      <p class="lead">${rng.pick(niche.about)}. ${rng.pick(['Nothing here is accidental.', 'Every detail is a decision.', 'We would rather do less, better.'])} ${rng.pick(['That is the whole philosophy.', 'It takes the time it takes.', 'You can feel the difference in a week.'])}</p>
      <div class="pull reveal">“${rng.pick(['Quality is just patience, priced honestly.', 'Craft is a schedule you keep.', 'Details are the design.'])}”</div>
    </div>
  </div></section>`;

  secHtml['services'] = `
  <section id="services"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}What we do</span><h2>Six ways in</h2></div>
    <div class="gridFeat">${niche.services.map((s, i) => `
      <article class="card reveal"><div class="cnum">${String(i + 1).padStart(2, '0')}</div><h3>${s}</h3><p>${rng.pick(['Booked week by week.', 'Talk to us about timing.', 'The house favourite.', 'Small groups, big attention.', 'Ask us anything first.', 'Built around your schedule.'])}</p></article>`).join('')}
    </div>
  </div></section>`;

  secHtml['gallery'] = `
  <section id="gallery"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}Recent work</span><h2>Fresh from the bench</h2></div>
    <div class="gridGal">${niche.services.slice(0, 4).map((s, i) => `
      <figure class="tile reveal" style="background:${grads[i % grads.length]}"><span>${s}</span></figure>`).join('')}
    </div>
  </div></section>`;

  const menuItems = niche.services.slice(0, 6).map((s) => {
    const price = niche.priceBase * (1 + rng.float(0, 2.4));
    return `<div class="menuRow"><div><b>${s}</b><small>${rng.pick(['Made to order', 'House standard', 'Seasonal', 'Most requested', 'Limited daily run'])}</small></div><i>${money(Math.round(price * 100) / 100)}</i></div>`;
  }).join('');
  secHtml['menu'] = `
  <section id="menu"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}Priced plainly</span><h2>${niche.menuTitle}</h2></div>
    <div class="menuList reveal">${menuItems}</div>
  </div></section>`;

  const stats = niche.statLabels.map((l, i) => {
    const vals = [rng.int(4, 40), rng.int(60, 900), rng.int(3, 18), rng.int(1998, 2021)];
    return `<div class="stat"><b>${vals[i]}${i === 1 ? '+' : ''}</b><span>${l}</span></div>`;
  }).join('');
  secHtml['stats'] = `
  <section id="stats"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}Numbers, kept honest</span><h2>The scoreboard</h2></div>
    <div class="gridStats reveal">${stats}</div>
  </div></section>`;

  secHtml['testimonials'] = `
  <section id="testimonials"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}Word of mouth</span><h2>What people say</h2></div>
    <div class="quotes">
      <blockquote class="quote reveal"><p>“${niche.quotes[0]}”</p><footer>— ${rng.pick(['Maren', 'Diego', 'Priya', 'Tomás', 'Ada', 'Jonas'])}, ${city}</footer></blockquote>
      <blockquote class="quote reveal"><p>“${niche.quotes[1]}”</p><footer>— ${rng.pick(['Sofia', 'Kwame', 'Elin', 'Marco', 'Yuki', 'Ruth'])}, regular since ${rng.int(2019, 2025)}</footer></blockquote>
    </div>
  </div></section>`;

  const genericFaqs = [
    { q: 'Where are you?', a: `${rng.pick(['Right by', 'Two doors from', 'Behind the arches of'])} ${niche.place} in ${city} — knock during opening hours.` },
    { q: 'How do I reach you fastest?', a: `Email ${email} or call ${phone}. We answer within one working day.` },
    { q: 'Do you do gift options?', a: rng.pick(['Yes — ask at the counter and we will wrap it properly.', 'Absolutely, with a handwritten note at no charge.']) },
  ];
  secHtml['faq'] = `
  <section id="faq"><div class="wrap faq">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}Asked often</span><h2>Good questions</h2></div>
    ${[...niche.faq, ...genericFaqs].slice(0, 5).map((f) => `<details><summary>${f.q}</summary><p class="fa">${f.a}</p></details>`).join('')}
  </div></section>`;

  const hours = rng.pick([
    ['Mon–Fri 8–18', 'Sat 9–16', 'Sun closed'],
    ['Tue–Sat 10–20', 'Sun 11–15', 'Mon closed'],
    ['Mon–Sat 9–19', 'Sun 10–14', 'Late night Thu'],
  ]);
  secHtml['contact'] = `
  <section id="contact"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}Visit</span><h2>Find us in ${city}</h2></div>
    <div class="contactCols">
      <div class="cbox reveal"><h3>Address</h3><p>${rng.int(2, 148)} ${niche.place}<br/>${city}</p></div>
      <div class="cbox reveal"><h3>Hours</h3><ul>${hours.map((h) => `<li>${h}</li>`).join('')}</ul></div>
      <div class="cbox reveal"><h3>Contact</h3><ul><li><a href="mailto:${email}">${email}</a></li><li>${phone}</li></ul></div>
    </div>
  </div></section>`;

  secHtml['cta'] = `
  <section id="cta"><div class="wrap"><div class="ctaBand reveal">
    <h2>${rng.pick(['Ready when you are.', 'Come see for yourself.', 'One message starts it.'])}</h2>
    <p style="opacity:.85;margin-bottom:20px">${rng.pick(['No pressure, no scripts.', 'Tell us what you need.', 'We reply within a day.'])}</p>
    <a class="btn" href="#contact">${rng.pick(['Book now', 'Start the conversation', 'Claim your spot'])}</a>
  </div></div></section>`;

  const fontsUrl = `https://fonts.googleapis.com/css2?family=${design.fontHead.replace(/ /g, '+')}:wght@400;600;700;800&family=${design.fontBody.replace(/ /g, '+')}:wght@400;500;700&display=swap`;
  const navLinksHtml = navAnchors.map((a, i) => `<li class="${i > 2 ? 'hideD2' : ''}"><a href="#${a.id}">${a.label}</a></li>`).join('');
  const drawerLinks = navAnchors.map((a) => `<a class="dl" href="#${a.id}">${a.label}</a>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en" data-hero="${design.heroVariant}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${brand} — ${niche.label} in ${city}</title>
<meta name="description" content="${headline} ${brand}, a ${niche.label} in ${city}. ${sub}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="${fontsUrl}" rel="stylesheet"/>
<style>${buildCss(palette, design, niche)}</style>
</head>
<body data-hero="${design.heroVariant}" data-motif="${design.motif}">
<div class="ambient" aria-hidden="true"></div>
<header class="nav"><div class="wrap navIn">
  <a class="logo" href="#top"><span class="logoDot"></span>${brand}</a>
  <ul class="navLinks">${navLinksHtml}</ul>
  <a class="btn btnFill navCta" href="#contact" style="min-height:44px">${rng.pick(['Book', 'Enquire', 'Visit'])}</a>
  <button class="burger" aria-label="Open menu" aria-expanded="false" onclick="document.getElementById('drawer').classList.add('open');this.setAttribute('aria-expanded','true')"><span></span><span></span><span></span></button>
</div></header>
<nav class="drawer" id="drawer" aria-label="Mobile menu">
  <div class="drawerTop"><span class="logo"><span class="logoDot"></span>${brand}</span>
  <button class="burger" style="display:inline-flex" aria-label="Close menu" onclick="document.getElementById('drawer').classList.remove('open');document.querySelectorAll('.burger')[0].setAttribute('aria-expanded','false')"><span style="transform:rotate(45deg) translateY(5px)"></span><span style="opacity:0"></span><span style="transform:rotate(-45deg) translateY(-5px)"></span></button></div>
  ${drawerLinks}
  <a class="btn btnFill" href="#contact" onclick="document.getElementById('drawer').classList.remove('open')">Book a visit</a>
</nav>
<main>
${design.sectionOrder.map((s) => secHtml[s]).join('\n')}
</main>
<footer class="site"><div class="wrap">
  <div class="footCols">
    <div><a class="logo" href="#top" style="color:var(--ink)"><span class="logoDot"></span>${brand}</a>
      <p style="color:var(--inkSoft);font-size:.92rem;margin-top:10px;max-width:34ch">${headline} ${brand} — ${niche.label} in ${city}, since ${rng.int(1998, 2021)}.</p>
      <div class="mega-only" style="margin-top:16px"><h4>First to know</h4><p style="color:var(--inkSoft);font-size:.9rem">Seasonal notes, once a month. No noise.</p>
      <form style="display:flex;gap:8px;margin-top:10px" onsubmit="event.preventDefault();this.innerHTML='<small>Thank you — you are on the list.</small>'">
        <input type="email" required placeholder="you@example.com" style="flex:1;min-height:44px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--btnR);background:var(--surface);color:var(--ink);font-family:var(--fb)"/>
        <button class="btn btnFill" style="min-height:44px">Join</button></form></div></div>
    <div><h4>Explore</h4><ul>${navAnchors.map((a) => `<li><a href="#${a.id}">${a.label}</a></li>`).join('')}</ul></div>
    <div><h4>Visit</h4><ul><li>${rng.int(2, 148)} ${niche.place}</li><li>${city}</li><li><a href="mailto:${email}">${email}</a></li><li>${phone}</li></ul></div>
    <div><h4>Legal</h4><ul><li><a href="#top">Privacy</a></li><li><a href="#top">Terms</a></li><li><a href="#top">Accessibility</a></li></ul></div>
  </div>
  <div class="copy">
    <span>© <span class="stamp">${year}</span> ${owner}. All rights reserved.</span>
    <span class="stamp">Grown by Beast Web Developer · seed ${seed.slice(0, 8)} · ${palette.name} / ${design.heroVariant} hero</span>
  </div>
</div></footer>
<div class="mbar"><a class="btn btnFill" href="tel:${phone.replace(/[^+\d]/g, '')}">Call</a><a class="btn btnGhost" href="#contact" style="background:var(--bg)">Book</a></div>
<script>
  var y=document.querySelectorAll('.stamp');for(var i=0;i<y.length;i++){if(y[i].textContent.length===4)y[i].textContent=new Date().getFullYear()}
  ${design.reveal ? `var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});` : `document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('in')});`}
</script>
</body>
</html>`;

  return { brand, niche, city, design, palette, html, email, phone };
}

export { DEVICE_CLASSES };
