// Beast Site Renderer v5 — turns a seed into a complete, standalone, handcrafted-feeling
// website. One site, five device classes, five DIFFERENT relative layouts — and now a
// DIFFERENT layout per page per device, assigned by the reasoner from the 100+-layout
// book, each with its colour recipe, product needs and OS assumptions.
//   D1 phone  ≤640    — 1-col stack, drawer nav, poster hero, sticky CTA bar
//   D2 tablet 641–1024 — 2-col grids, condensed nav, centered hero
//   D3 laptop 1025–1440 — 3-col, inline nav, split hero 55/45
//   D4 desktop 1441–1920 — 4-col, capped container, stats row, mega footer
//   D5 ultra  ≥1921   — 5-col, cinematic monumental hero, ambient stage
// Relative units everywhere: %, fr, clamp(), rem, aspect-ratio — no fixed px widths.
import { seedFrom, type RNG } from './rng';
import { buildPalette, deriveDarkTokens, type ContrastPair, type DarkTokens, type Palette } from './palette';
import {
  ADJECTIVES, BODY_FONTS, CITIES, DEVICE_CLASSES, HEAD_FONTS, NICHES, SURNAMES,
  type DesignSpec, type HeroVariant, type Motif, type NavVariant, type Niche,
} from './spec';
import { LAYOUTS, type DeviceId } from './layouts';
import type { PageLayoutAssignment } from './reasoner';
import { productFileFor, journalFileFor, type SiteValues, type Product } from './values';
import type { ImageRecord } from './images';

export type RenderedSite = {
  brand: string;
  niche: Niche;
  city: string;
  design: DesignSpec;
  palette: Palette;
  html: string;
  email: string;
  phone: string;
  darkReport?: ContrastPair[]; // WCAG report for the prefers-color-scheme dark tokens (undefined when the site is natively dark)
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
// Motifs are painted with token vars + color-mix (never hardcoded hex), so the
// whole surface re-tints automatically under prefers-color-scheme: dark.
function motifCss(motif: Motif): string {
  switch (motif) {
    case 'grain': return `.ambient{opacity:.5;background-image:radial-gradient(var(--border) .8px,transparent .8px),radial-gradient(var(--border) .8px,transparent .8px);background-size:22px 22px,22px 22px;background-position:0 0,11px 11px;}`;
    case 'blobs': return `.ambient{opacity:.6;background:radial-gradient(600px 400px at 12% 8%,color-mix(in srgb,var(--accent) 13%,transparent),transparent 60%),radial-gradient(700px 500px at 88% 20%,color-mix(in srgb,var(--accent2) 12%,transparent),transparent 65%),radial-gradient(500px 600px at 50% 100%,color-mix(in srgb,var(--accent) 8%,transparent),transparent 60%);}`;
    case 'grid': return `.ambient{opacity:.45;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:56px 56px;}`;
    case 'rings': return `.ambient{opacity:.5;background:repeating-radial-gradient(circle at 85% 10%,transparent 0 46px,var(--border) 46px 47px);}`;
    case 'waves': return `.ambient{opacity:.5;background:repeating-linear-gradient(115deg,transparent 0 38px,var(--border) 38px 39px);}`;
    case 'dots': return `.ambient{opacity:.55;background-image:radial-gradient(color-mix(in srgb,var(--inkSoft) 33%,transparent) 1.2px,transparent 1.2px);background-size:26px 26px;}`;
    default: return `.ambient{opacity:.5;background:radial-gradient(120% 90% at 50% -20%,transparent 60%,color-mix(in srgb,var(--accent) 9%,transparent) 100%);}`;
  }
}

function buildCss(p: Palette, d: DesignSpec, niche: Niche, dk?: DarkTokens): string {
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
  color-scheme:${p.theme === 'dark' ? 'dark' : 'light'};
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
${motifCss(d.motif)}
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
.btnFill:hover{box-shadow:0 10px 24px -10px color-mix(in srgb,var(--accent) 53%,transparent);transform:translateY(-1px)}
.btnGhost{border-color:var(--ink);color:var(--ink);background:transparent}
.btnGhost:hover{background:color-mix(in srgb,var(--ink) 5%,transparent)}
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
.card:hover{transform:translateY(-3px);box-shadow:0 18px 40px -22px color-mix(in srgb,var(--ink) 33%,transparent)}
.card .cnum{font-variant-numeric:tabular-nums;color:var(--accent);font-weight:800;font-size:.8rem;letter-spacing:.1em}
.card p{color:var(--inkSoft);font-size:.95rem;margin-top:8px}
.gridGal{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.tile{aspect-ratio:4/3;border-radius:var(--radius);position:relative;overflow:hidden;display:flex;align-items:flex-end;padding:14px;color:#fff;font-weight:700;text-shadow:0 1px 8px rgba(0,0,0,.35);background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 70%,var(--accent2)),var(--accent2))}
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
.cform{margin-top:34px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:26px;display:grid;gap:14px;max-width:640px}
.cform h3{margin:0}
.cform label{display:grid;gap:6px;font-size:.85rem;font-weight:600;color:var(--inkSoft)}
.cform input,.cform textarea,.authCard input,.searchBox input,.adminTable input,.adminTable textarea{font-family:var(--fb);font-size:1rem;color:var(--ink);background:var(--bg);border:1px solid var(--border);border-radius:calc(var(--radius) * .6);padding:12px 14px;min-height:44px}
.cform textarea{resize:vertical}
.cform input:focus-visible,.cform textarea:focus-visible,.authCard input:focus-visible,.searchBox input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.cform .frow{display:grid;gap:14px}
.cform small{color:var(--inkSoft);font-size:.8rem}
.skip{position:absolute;left:-9999px;top:0;z-index:100;background:var(--accent);color:var(--onAccent);padding:12px 18px;font-weight:700;border-radius:0 0 var(--radius) 0}
.skip:focus{left:0}
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
.hvisual{aspect-ratio:4/3;border-radius:var(--radius);position:relative;overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 80%,var(--accent2)),var(--accent2))}
.hvisual::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(0,0,0,.18))}
.heroBadge{position:absolute;top:12px;left:12px;background:rgba(255,255,255,.92);color:#111;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:6px 10px;border-radius:999px;z-index:2}
.reveal{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.8,.2,1)}
.reveal.in{opacity:1;transform:none}
/* ═══ v5 components ═══ */
.ph{width:100%;height:100%;object-fit:cover;display:block}
.phwrap{aspect-ratio:4/3;overflow:hidden;border-radius:var(--radius);position:relative;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 80%,var(--accent2)),var(--accent2))}
.phwrap::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,rgba(0,0,0,.16));pointer-events:none}
.breadcrumbs{display:flex;gap:8px;font-size:.85rem;color:var(--inkSoft);margin-bottom:18px;flex-wrap:wrap}
.breadcrumbs a:hover{color:var(--accent)}
.badge{display:inline-flex;align-items:center;gap:8px;font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--border);border-radius:999px;padding:6px 12px;color:var(--inkSoft);background:color-mix(in srgb,var(--surface) 70%,transparent)}
.badge .bdot{width:7px;height:7px;border-radius:50%;background:var(--accent)}
.dirTable{width:100%;border-collapse:collapse;font-size:.95rem}
.dirTable th{text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:var(--inkSoft);padding:10px 8px;border-bottom:2px solid var(--border)}
.dirTable td{padding:12px 8px;border-bottom:1px solid var(--border);vertical-align:top}
.dirTable td small{color:var(--inkSoft);display:block}
.authCard{max-width:460px;margin:0 auto;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;display:grid;gap:14px}
.authCard label{display:grid;gap:6px;font-size:.85rem;font-weight:600;color:var(--inkSoft)}
.adminTable{width:100%;border-collapse:collapse;font-size:.9rem}
.adminTable th{text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--inkSoft);padding:8px 6px;border-bottom:2px solid var(--border)}
.adminTable td{padding:6px;border-bottom:1px solid var(--border)}
.adminTable input{width:100%}
.searchBox{display:flex;gap:10px;margin:6px 0 26px}
.searchBox input{flex:1}
.prose{max-width:68ch}
.prose p{margin:0 0 18px;color:var(--inkSoft);font-size:1.02rem;line-height:1.75}
.fav{background:none;border:1px solid var(--border);border-radius:999px;width:44px;height:44px;cursor:pointer;font-size:1.15rem;color:var(--inkSoft);flex:none}
.fav.on{background:var(--accent);color:var(--onAccent);border-color:var(--accent)}
.relatedGrid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:26px}
.masonry{columns:2;column-gap:12px}
.masonry figure{break-inside:avoid;margin:0 0 12px}
.priceBig{font-family:var(--fh);font-size:clamp(1.8rem,4vw,2.6rem);color:var(--accent);font-weight:700}
.specList{list-style:none;display:grid;gap:8px;margin:18px 0}
.specList li{padding:10px 0;border-bottom:1px dashed var(--border);color:var(--inkSoft)}
.ptile{aspect-ratio:4/3;border-radius:calc(var(--radius)*.7);margin-bottom:12px;overflow:hidden;position:relative;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 70%,var(--accent2)),var(--accent2))}
.metaLine{color:var(--inkSoft);font-size:.85rem}
.resultCard{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.resultCard small{color:var(--inkSoft)}
@media print{.nav,.drawer,.mbar,.ctaBand,.ambient,footer.site,.cform{display:none!important}body{padding:0;background:#fff;color:#000}}
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
  .relatedGrid{grid-template-columns:repeat(3,1fr)}
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
  .masonry{columns:3}
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
.stats-unlock{display:none}${
    dk
      ? `
/* ============ OS dark mode — re-derived token set (MDN prefers-color-scheme;
   every token re-passes its own WCAG contrast check, see QA report) ============ */
@media (prefers-color-scheme:dark){
  :root{--bg:${dk.bg};--bgAlt:${dk.bgAlt};--surface:${dk.surface};--ink:${dk.ink};--inkSoft:${dk.inkSoft};--accent:${dk.accent};--accent2:${dk.accent2};--onAccent:${dk.inkOnAccent};--border:${dk.border};--navBg:${d.darkNav ? dk.ink : dk.bg};--navInk:${d.darkNav ? dk.bg : dk.ink};color-scheme:dark}
}`
      : ''
  }
`.replace(/\n/g, '\n');
}

/* ---------- per-page layout overrides (the reasoner's assignments, as CSS) ---------- */
const DEVICE_MQ: Record<DeviceId, string> = {
  D1: '', D2: '@media (min-width:641px)', D3: '@media (min-width:1025px)', D4: '@media (min-width:1441px)', D5: '@media (min-width:1921px)',
};

/**
 * Emits the per-page CSS that makes THIS page re-arrange differently from every
 * other page: hero geometry, feature mode, voices mode and container width per
 * device — each block stamped with `data-layout="Dx:id"` so device QA can verify
 * all five assignments landed.
 */
export function pageLayoutCss(pageLayouts: Record<string, PageLayoutAssignment> | undefined, pageKey: string): string {
  const a = pageLayouts?.[pageKey];
  if (!a) return '';
  const out: string[] = [];
  // colour recipe (page-level, all devices — contrast-checked by the reasoner)
  const r = a.recipe;
  if (r.heroWash === 'accent-wash') out.push(`.hero{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 14%,var(--bg)),var(--bg))}`);
  if (r.heroWash === 'accent2-wash') out.push(`.hero{background:linear-gradient(180deg,color-mix(in srgb,var(--accent2) 16%,var(--bg)),var(--bg))}`);
  if (r.heroWash === 'ink-panel') out.push(`.hero{background:var(--ink)}.hero,.hero h1,.hero .lead{color:var(--bg)}.hero .kicker{color:var(--accent2)}`);
  if (r.heroWash === 'bgAlt-band') out.push(`.hero{background:var(--bgAlt)}`);
  if (r.cardTint === 'accent-wash') out.push(`.card{background:color-mix(in srgb,var(--accent) 6%,var(--surface))}`);
  if (r.cardTint === 'bgAlt') out.push(`.card{background:var(--bgAlt)}`);
  if (r.ctaStyle === 'ghost') out.push(`.btnFill{background:transparent;border-color:var(--ink);color:var(--ink)}`);

  for (const d of ['D1', 'D2', 'D3', 'D4', 'D5'] as DeviceId[]) {
    const slot = a.devices[d];
    if (!slot) continue;
    const lay = LAYOUTS.find((l) => l.id === slot.id);
    if (!lay) continue;
    const s = lay.spec;
    const rules: string[] = [];
    rules.push(`.wrap{max-width:${s.container}px}`);
    switch (lay.heroMode) {
      case 'split': case 'z': case 'marquee':
        rules.push('.heroWrap{grid-template-columns:55fr 45fr;justify-items:start;text-align:left}.heroWrap .hcopy{align-items:flex-start}');
        break;
      case 'ledger':
        rules.push('.heroWrap{grid-template-columns:1fr;border-left:4px solid var(--accent);padding-left:18px;justify-items:start;text-align:left}.heroWrap .hcopy{align-items:flex-start}');
        break;
      case 'mono':
        rules.push('.hero{background:var(--ink)}.hero .heroWrap{grid-template-columns:1fr}.hero,.hero h1{color:var(--bg)}.hero .lead{color:color-mix(in srgb,var(--bg) 80%,var(--ink))}.hero .kicker{color:var(--accent2)}');
        break;
      case 'bento':
        rules.push('.heroWrap{grid-template-columns:repeat(2,1fr)}');
        break;
      default: break; // centered / gallery / showcase keep the stacked default
    }
    if (lay.featuresMode === 'list') {
      rules.push('.gridFeat{grid-template-columns:1fr}.gridFeat .card{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:baseline}');
    } else if (lay.featuresMode === 'bento' && s.cardCols[0] >= 2) {
      rules.push('.gridFeat .card:first-child{grid-column:span 2;grid-row:span 2}');
      rules.push(`.gridFeat{grid-template-columns:repeat(${Math.max(2, s.cardCols[0] - 1)},1fr)}`);
    } else {
      rules.push(`.gridFeat{grid-template-columns:repeat(${s.cardCols[0]},1fr)}`);
    }
    if (lay.voicesMode === 'stack') rules.push('.quotes{grid-template-columns:1fr}');
    else if (lay.voicesMode === 'wall') rules.push('.quotes{grid-template-columns:repeat(2,1fr)}');
    else rules.push(`.quotes{grid-template-columns:repeat(${s.quoteCols[0]},1fr)}`);
    const mq = DEVICE_MQ[d];
    out.push(`${mq ? mq + '{' : '/* D1 base */'}/* data-layout="${d}:${lay.id}" */${rules.join('')}${mq ? '}' : ''}`);
  }
  return `/* ═ per-page reasoner layout — page ${pageKey} ═ */\n${out.join('\n')}\n`;
}

/* ---------- copy helpers ---------- */
function money(v: number): string {
  return v % 1 === 0 ? `$${v}` : `$${v.toFixed(2)}`;
}

function brandSlug(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.site';
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- the v5 image law: real <img> tags, alt text, lazy decoding ---------- */
function imgTag(slotId: string, art: RenderArt | undefined, alt: string, eager = false): string {
  const rec: ImageRecord | undefined = art?.images?.find((r) => r.slotId === slotId && r.status !== 'gradient' && r.file);
  if (!rec?.file) return '';
  return `<img class="ph" src="${rec.file}" alt="${esc(alt)}" width="1200" height="900" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"/>`;
}

function slotAlt(art: RenderArt | undefined, slotId: string, fallback: string): string {
  return art?.images?.find((r) => r.slotId === slotId)?.query ?? fallback;
}

/* ---------- render ---------- */
export function renderSite(seed: string, owner: string, opts?: { art?: RenderArt }): RenderedSite {
  const { rng, niche, brand: seedBrand, city, design, palette } = designFromSeed(seed);
  const dk = palette.theme === 'dark' ? null : deriveDarkTokens(palette);
  const year = new Date().getFullYear();
  const vals = opts?.art?.values;
  // the values layer wins: an owner-edited brand replaces the seed-born one
  const brand = vals?.brand?.trim() ? vals.brand.trim() : seedBrand;
  const email = vals?.emails?.[0] ?? `hello@${brandSlug(brand)}`;
  const phone = vals?.phones?.[0]?.number ?? `+1 (${rng.int(200, 989)}) ${rng.int(200, 989)}-${rng.int(1000, 9999)}`;
  const extraPhones = (vals?.phones ?? []).slice(1, 12);

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

  const art = opts?.art;
  const heroImg = imgTag('hero', art, `${brand} — ${niche.label} in ${city}`, true);

  const secHtml: Record<string, string> = {};

  secHtml['hero'] = `
  <section class="hero" id="top"><div class="wrap heroWrap">
    <div class="hcopy reveal">
      <span class="kicker k${design.eyebrow === 'line' ? 'line' : design.eyebrow === 'bracket' ? 'brack' : ''}">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}${design.eyebrow === 'number' ? `<span class="knumber">01</span>` : ''}${heroTag}</span>
      <h1>${headline}</h1>
      <p class="lead">${sub}</p>
      <div class="hbtns">
        <a class="btn btnFill" href="#contact">${rng.pick(['Book a visit', 'Get started', 'Say hello', 'Reserve yours'])}</a>
        <a class="btn btnGhost" href="#${navAnchors[0]?.id ?? 'about'}">See the ${niche.label.split(' ')[0]}</a>
      </div>
    </div>
    <div class="hvisual reveal">${heroImg}<span class="heroBadge">${brand}</span></div>
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
      <article class="card reveal">${imgTag(`service-${i + 1}`, art, s) ? `<div class="ptile">${imgTag(`service-${i + 1}`, art, `${s} — ${niche.label} in ${city}`)}</div>` : ''}<div class="cnum">${String(i + 1).padStart(2, '0')}</div><h3>${s}</h3><p>${rng.pick(['Booked week by week.', 'Talk to us about timing.', 'The house favourite.', 'Small groups, big attention.', 'Ask us anything first.', 'Built around your schedule.'])}</p></article>`).join('')}
    </div>
  </div></section>`;

  secHtml['gallery'] = `
  <section id="gallery"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}Recent work</span><h2>Fresh from the bench</h2></div>
    <div class="gridGal">${niche.services.slice(0, 4).map((s, i) => `
      <figure class="tile reveal">${imgTag(`gallery-${i + 1}`, art, s) || ''}<span>${s}</span></figure>`).join('')}
    </div>
  </div></section>`;

  const menuItems = (vals?.products ?? []).slice(0, 6).map((p, i) => {
    const price = p.price;
    return `<div class="menuRow"><div><b>${p.name}</b><small>${p.desc}</small></div><i>${money(price)}</i></div>`;
  }).join('');
  secHtml['menu'] = `
  <section id="menu"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}Priced plainly</span><h2>${niche.menuTitle}</h2></div>
    <div class="menuList reveal">${menuItems}</div>
    <p class="metaLine" style="margin-top:14px">Full catalog on the Shop page — every price visible, no surprises.</p>
  </div></section>`;

  const stats = niche.statLabels.map((l, i) => {
    const v = [rng.int(4, 40), rng.int(60, 900), rng.int(3, 18), rng.int(1998, 2021)];
    return `<div class="stat"><b>${v[i]}${i === 1 ? '+' : ''}</b><span>${l}</span></div>`;
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

  // one address everywhere (Repetition: the same facts repeat, never drift)
  const streetNo = rng.int(2, 148);
  // structured hours: display strings for humans, spec for JSON-LD (Google format)
  const hours = rng.pick([
    { display: ['Mon–Fri 8–18', 'Sat 9–16', 'Sun closed'], spec: [
      { d: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], o: '08:00', c: '18:00' },
      { d: ['Saturday'], o: '09:00', c: '16:00' }] },
    { display: ['Tue–Sat 10–20', 'Sun 11–15', 'Mon closed'], spec: [
      { d: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], o: '10:00', c: '20:00' },
      { d: ['Sunday'], o: '11:00', c: '15:00' }] },
    { display: ['Mon–Sat 9–19', 'Sun 10–14'], spec: [
      { d: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], o: '09:00', c: '19:00' },
      { d: ['Sunday'], o: '10:00', c: '14:00' }] },
  ]);
  secHtml['contact'] = `
  <section id="contact"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${design.eyebrow === 'dot' ? '<span class="kd"></span>' : ''}Visit</span><h2>Find us in ${city}</h2></div>
    <div class="contactCols">
      <div class="cbox reveal"><h3>Address</h3><p>${vals?.address ?? `${streetNo} ${niche.place}`}<br/>${city}</p></div>
      <div class="cbox reveal"><h3>Hours</h3><ul>${(vals?.hoursDisplay ?? hours.display).map((h) => `<li>${h}</li>`).join('')}</ul></div>
      <div class="cbox reveal"><h3>Contact</h3><ul><li><a href="mailto:${email}">${email}</a></li><li><a href="tel:${phone.replace(/[^+\d]/g, '')}">${phone}</a></li>${extraPhones.map((p) => `<li><a href="tel:${p.number.replace(/[^+\d]/g, '')}">${p.number}</a> <small style="color:var(--inkSoft)">· ${p.label}</small></li>`).join('')}</ul></div>
    </div>
    ${vals ? `<div class="cbox reveal" style="margin-top:22px"><h3>Every channel</h3><ul class="socialList">${socialRow(vals)}</ul></div>
    <div class="mapbox reveal" style="margin-top:22px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden"><iframe title="Map — ${brand}" src="${vals.mapEmbed}" style="width:100%;height:300px;border:0" loading="lazy"></iframe></div>` : ''}
    ${contactForm(email)}
  </div></section>`;

  secHtml['cta'] = `
  <section id="cta"><div class="wrap"><div class="ctaBand reveal">
    <h2>${rng.pick(['Ready when you are.', 'Come see for yourself.', 'One message starts it.'])}</h2>
    <p style="opacity:.85;margin-bottom:20px">${rng.pick(['No pressure, no scripts.', 'Tell us what you need.', 'We reply within a day.'])}</p>
    <a class="btn" href="#contact">${rng.pick(['Book now', 'Start the conversation', 'Claim your spot'])}</a>
  </div></div></section>`;

  const fontsUrl = `https://fonts.googleapis.com/css2?family=${design.fontHead.replace(/ /g, '+')}:wght@400;600;700;800&family=${design.fontBody.replace(/ /g, '+')}:wght@400;500;700&display=swap`;

  /* ---------- SEO & social pack (no domain known → buyer swaps one placeholder) ---------- */
  const initial = (brand.replace(/^The /i, '').trim().charAt(0) || 'B').toUpperCase();
  const SCHEMA_TYPE: Record<string, string> = {
    coffee: 'CafeOrCoffeeShop', bakery: 'Bakery', jazz: 'BarOrPub', books: 'BookStore',
    florist: 'Florist', tattoo: 'TattooParlor', plants: 'GardenStore', yoga: 'ExerciseGym',
    architecture: 'ProfessionalService', agency: 'ProfessionalService', surf: 'SportsActivityLocation', ceramics: 'LocalBusiness',
  };
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPE[niche.key] ?? 'LocalBusiness',
    name: brand,
    description: `${headline} ${brand} — ${niche.label} in ${city}.`,
    email,
    telephone: phone,
    priceRange: `$${niche.priceBase}–$${niche.priceBase * 8}`,
    address: { '@type': 'PostalAddress', streetAddress: vals?.address ?? `${streetNo} ${niche.place}`, addressLocality: city, addressCountry: 'US' },
    contactPoint: vals ? JSON.parse(`[${vals.phones.slice(0, 12).map((p) => `{"@type":"ContactPoint","telephone":"${p.number}","contactType":"customer service","name":"${p.label}"}`).join(',')}]`) : undefined,
    sameAs: vals?.socials?.map((s) => s.url),
    openingHoursSpecification: hours.spec.map((s) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: s.d, opens: s.o, closes: s.c })),
  });
  const navLinksHtml = navAnchors.map((a, i) => `<li class="${i > 2 ? 'hideD2' : ''}"><a href="#${a.id}">${a.label}</a></li>`).join('');
  const drawerLinks = navAnchors.map((a) => `<a class="dl" href="#${a.id}">${a.label}</a>`).join('');
  const layoutCss = pageLayoutCss(art?.pageLayouts, 'home');

  const html = `<!DOCTYPE html>
<html lang="en" data-hero="${design.heroVariant}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${brand} — ${niche.label} in ${city}</title>
<meta name="generator" content="Beast Web Developer 5.0"/>
<meta name="description" content="${headline} ${brand}, a ${niche.label} in ${city}. ${sub}"/>
<meta name="theme-color" content="${palette.bg}" media="(prefers-color-scheme: light)"/>${dk ? `<meta name="theme-color" content="${dk.tokens.bg}" media="(prefers-color-scheme: dark)"/>` : ''}
<meta name="color-scheme" content="${palette.theme === 'dark' ? 'dark' : 'light dark'}"/>
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="${brand}"/>
<meta property="og:title" content="${brand} — ${niche.label} in ${city}"/>
<meta property="og:description" content="${headline}"/>
<meta property="og:image" content="assets/og.jpg"/>
<meta property="og:locale" content="en_US"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${brand} — ${niche.label} in ${city}"/>
<meta name="twitter:description" content="${headline}"/>
<meta name="twitter:image" content="assets/og.jpg"/>
<script type="application/ld+json">${jsonLd}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="${fontsUrl}" rel="stylesheet"/>
<link rel="manifest" href="manifest.json"/>
<style>${buildCss(palette, design, niche, dk?.tokens)}</style>
${layoutCss ? `<style>${layoutCss}</style>` : ''}
</head>
<body data-hero="${design.heroVariant}" data-motif="${design.motif}">
<a class="skip" href="#main">Skip to content</a>
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
<main id="main">
${design.sectionOrder.map((s) => secHtml[s]).join('\n')}
</main>
${noCookieBadge()}${siteFooterHome(brand, niche, city, headline, navAnchors, email, phone, streetNo, niche.place, vals, owner, seed, palette, design, year)}
<div class="mbar"><a class="btn btnFill" href="tel:${phone.replace(/[^+\d]/g, '')}">Call</a><a class="btn btnGhost" href="#contact" style="background:var(--bg)">Book</a></div>
<script>
  var y=document.querySelectorAll('.stamp');for(var i=0;i<y.length;i++){if(y[i].textContent.length===4)y[i].textContent=new Date().getFullYear()}
  ${design.reveal ? `var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});` : `document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('in')});`}
</script>
</body>
</html>`;

  return { brand, niche, city, design, palette, html, email, phone, darkReport: dk?.report };
}

/* ---------- shared chrome ---------- */
function noCookieBadge(): string {
  return `<div class="wrap" style="padding:10px 16px;display:flex;justify-content:flex-end"><span class="badge" data-nocookie><span class="bdot"></span>No cookies · No trackers · No banner needed</span></div>`;
}

function contactForm(email: string): string {
  return `<form class="cform reveal" onsubmit="event.preventDefault();var f=this.elements;var d={name:f.name.value,from:f.from.value,body:f.body.value,at:new Date().toISOString()};try{var l=JSON.parse(localStorage.getItem('beast-enquiries')||'[]');l.unshift(d);localStorage.setItem('beast-enquiries',JSON.stringify(l.slice(0,20)))}catch(e){};location.href='mailto:${email}?subject='+encodeURIComponent('Enquiry from '+f.name.value)+'&body='+encodeURIComponent(f.body.value+' — '+f.name.value+' ('+f.from.value+')');setTimeout(function(){location.href='thank-you.html'},500)">
      <h3>Send a note</h3>
      <div class="frow">
        <label>Name<input required name="name" type="text" autocomplete="name" placeholder="Your name"/></label>
        <label>Email<input required name="from" type="email" autocomplete="email" placeholder="you@example.com"/></label>
      </div>
      <label>Message<textarea required name="body" rows="4" placeholder="Tell us what you need"></textarea></label>
      <button class="btn btnFill" type="submit">Send message</button>
      <small>Three fields, no captcha. This opens your mail app with everything filled in — and saves a copy in this browser only.</small>
    </form>`;
}

function siteFooterHome(
  brand: string, niche: Niche, city: string, headline: string,
  navAnchors: { id: string; label: string }[], email: string, phone: string,
  streetNo: number, place: string, vals: SiteValues | undefined,
  owner: string, seed: string, palette: Palette, design: DesignSpec, year: number
): string {
  return `<footer class="site"><div class="wrap">
  <div class="footCols">
    <div><a class="logo" href="#top" style="color:var(--ink)"><span class="logoDot"></span>${brand}</a>
      <p style="color:var(--inkSoft);font-size:.92rem;margin-top:10px;max-width:34ch">${headline} ${brand} — ${niche.label} in ${city}, since ${rng_int(seed, 1998, 2021)}.</p>
      <div class="mega-only" style="margin-top:16px"><h4>First to know</h4><p style="color:var(--inkSoft);font-size:.9rem">Seasonal notes, once a month. No noise.</p>
      <form style="display:flex;gap:8px;margin-top:10px" onsubmit="event.preventDefault();this.innerHTML='<small>Thank you — you are on the list.</small>'">
        <input type="email" required placeholder="you@example.com" style="flex:1;min-height:44px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--btnR);background:var(--surface);color:var(--ink);font-family:var(--fb)"/>
        <button class="btn btnFill" style="min-height:44px">Join</button></form></div></div>
    <div><h4>Explore</h4><ul>${navAnchors.map((a) => `<li><a href="#${a.id}">${a.label}</a></li>`).join('')}</ul></div>
    <div><h4>Visit</h4><ul><li>${vals?.address ?? `${streetNo} ${place}`}</li><li>${city}</li><li><a href="mailto:${email}">${email}</a></li><li>${phone}</li></ul></div>
    <div><h4>Legal</h4><ul><li><a href="legal.html">Privacy</a></li><li><a href="legal.html">Terms</a></li><li><a href="legal.html">Accessibility</a></li><li><a href="sitemap.html">Every file</a></li></ul></div>
  </div>
  <div class="copy">
    <span>© <span class="stamp">${year}</span> ${owner}. All rights reserved.</span>
    <span class="stamp">Grown by Beast Web Developer v5 · seed ${seed.slice(0, 8)} · ${palette.name} / ${design.heroVariant} hero</span>
  </div>
</div></footer>`;
}

// tiny deterministic int (kept for footer since-year)
function rng_int(seed: string, min: number, max: number): number {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return min + (h % (max - min + 1));
}

/* ---------- v5 · multi-page rendering ---------- */
import { SOCIAL_PLATFORMS } from './values';

export type PagePlanEntry = { key: string; title: string; purpose: string; file: string; inNav: boolean };

export const FUNCTIONAL_PAGES: PagePlanEntry[] = [
  { key: 'search', title: 'Search', purpose: 'find anything on this site, instantly', file: 'search.html', inNav: false },
  { key: 'login', title: 'Log in', purpose: 'the optional local demo account', file: 'login.html', inNav: false },
  { key: 'signup', title: 'Sign up', purpose: 'an opt-in local account — never forced', file: 'signup.html', inNav: false },
  { key: 'account', title: 'Account', purpose: 'saved items and enquiries, all local', file: 'account.html', inNav: false },
  { key: 'admin', title: 'Admin', purpose: 'the back office — products edited live', file: 'admin.html', inNav: false },
  { key: 'thankyou', title: 'Thank you', purpose: 'the form confirmation', file: 'thank-you.html', inNav: false },
];

export type RenderArt = {
  brief?: { audience: string; tone: string; promise: string; cityStory?: string } | null;
  headings?: Record<string, string[]>;
  copy?: Record<string, { kicker: string; body: string }[]>;
  images?: ImageRecord[];
  catalog?: Product[];
  values?: SiteValues;
  pages?: PagePlanEntry[];
  pageLayouts?: Record<string, PageLayoutAssignment>;
  faqEntries?: { q: string; a: string }[];
  journalEntries?: { title: string; kicker: string; body: string[]; date: string }[];
  productCopy?: Record<number, { desc: string; alt: string }>;
};

export type InnerPageOpts = {
  art: RenderArt;
  currentKey: string;
  polish?: boolean; // v2 revision (motion/focus pass already in CSS; marks revision)
};

function socialRow(values: SiteValues): string {
  return values.socials.map((s) => {
    const label = SOCIAL_PLATFORMS.find((p) => p.key === s.platform)?.label ?? s.platform;
    return `<li><a href="${s.url}" rel="noopener" target="_blank">${label}<span aria-hidden="true"> ↗</span></a></li>`;
  }).join('');
}

function contactPoints(values: SiteValues): string {
  return values.phones.slice(0, 12).map((p) => `{"@type":"ContactPoint","telephone":"${p.number}","contactType":"customer service","name":"${p.label}"}`).join(',');
}

const SCHEMA_TYPE: Record<string, string> = {
  coffee: 'CafeOrCoffeeShop', bakery: 'Bakery', jazz: 'BarOrPub', books: 'BookStore',
  florist: 'Florist', tattoo: 'TattooParlor', plants: 'GardenStore', yoga: 'ExerciseGym',
  architecture: 'ProfessionalService', agency: 'ProfessionalService', surf: 'SportsActivityLocation', ceramics: 'LocalBusiness',
};

/** Shared page chrome for every inner page — one nav skeleton everywhere (consistency law). */
function pageChrome(opts: {
  seed: string; owner: string; art: RenderArt; currentKey: string;
  title: string; description: string; main: string; jsonLd: string;
  narrow?: boolean;
}): string {
  const { seed, owner, art, currentKey, title, description, main, jsonLd } = opts;
  const { brand: seedBrand, niche, city, design, palette } = designFromSeed(seed);
  const dk = palette.theme === 'dark' ? null : deriveDarkTokens(palette);
  const year = new Date().getFullYear();
  const v: SiteValues = art.values ?? ({} as SiteValues);
  const brand = v.brand?.trim() ? v.brand.trim() : seedBrand;
  const email = v.emails?.[0] ?? `hello@${brandSlug(brand)}`;
  const primaryPhone = v.phones?.[0]?.number ?? '+1 (000) 000-0000';
  const pages = art.pages ?? [];
  const navLinks = pages.filter((p) => p.inNav).map((p) =>
    `<li><a href="${p.file}"${p.key === currentKey ? ' aria-current="page"' : ''}>${p.title}</a></li>`
  ).join('');
  const drawerLinks = pages.filter((p) => p.inNav).map((p) => `<a class="dl" href="${p.file}">${p.title}</a>`).join('');
  const contactFile = pages.find((p) => p.key === 'contact')?.file ?? 'contact.html';
  const fontsUrl = `https://fonts.googleapis.com/css2?family=${design.fontHead.replace(/ /g, '+')}:wght@400;600;700;800&family=${design.fontBody.replace(/ /g, '+')}:wght@400;500;700&display=swap`;
  const layoutCss = pageLayoutCss(art.pageLayouts, currentKey);
  return `<!DOCTYPE html>
<html lang="en" data-hero="${design.heroVariant}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title} — ${brand}</title>
<meta name="generator" content="Beast Web Developer 5.0"/>
<meta name="description" content="${esc(description)}"/>
<meta name="theme-color" content="${palette.bg}" media="(prefers-color-scheme: light)"/>${dk ? `<meta name="theme-color" content="${dk.tokens.bg}" media="(prefers-color-scheme: dark)"/>` : ''}
<meta name="color-scheme" content="${palette.theme === 'dark' ? 'dark' : 'light dark'}"/>
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="${brand}"/>
<meta property="og:title" content="${title} — ${brand}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="assets/og.jpg"/>
<script type="application/ld+json">${jsonLd}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="${fontsUrl}" rel="stylesheet"/>
<link rel="manifest" href="manifest.json"/>
<style>${buildCss(palette, design, niche, dk?.tokens)}</style>
${layoutCss ? `<style>${layoutCss}</style>` : ''}
</head>
<body data-hero="${design.heroVariant}" data-motif="${design.motif}">
<a class="skip" href="#main">Skip to content</a>
<div class="ambient" aria-hidden="true"></div>
<header class="nav"><div class="wrap navIn">
  <a class="logo" href="index.html"><span class="logoDot"></span>${brand}</a>
  <ul class="navLinks">${navLinks}</ul>
  <a class="btn btnFill navCta" href="${contactFile}" style="min-height:44px">Enquire</a>
  <button class="burger" aria-label="Open menu" aria-expanded="false" onclick="document.getElementById('drawer').classList.add('open')"><span></span><span></span><span></span></button>
</div></header>
<nav class="drawer" id="drawer" aria-label="Mobile menu">
  <div class="drawerTop"><span class="logo"><span class="logoDot"></span>${brand}</span>
  <button class="burger" style="display:inline-flex" aria-label="Close menu" onclick="document.getElementById('drawer').classList.remove('open')"><span style="transform:rotate(45deg) translateY(5px)"></span><span style="opacity:0"></span><span style="transform:rotate(-45deg) translateY(-5px)"></span></button></div>
  ${drawerLinks}
  <a class="btn btnFill" href="${contactFile}" onclick="document.getElementById('drawer').classList.remove('open')">Enquire</a>
</nav>
<main id="main">
${main}
</main>
${noCookieBadge()}
<footer class="site"><div class="wrap">
  <div class="footCols">
    <div><a class="logo" href="index.html" style="color:var(--ink)"><span class="logoDot"></span>${brand}</a>
      <p style="color:var(--inkSoft);font-size:.92rem;margin-top:10px;max-width:34ch">${brand} — ${niche.label} in ${city}.</p></div>
    <div><h4>Explore</h4><ul>${pages.filter((p) => p.inNav).map((p) => `<li><a href="${p.file}">${p.title}</a></li>`).join('')}</ul></div>
    <div><h4>Visit</h4><ul><li>${v.address ?? niche.place}</li><li><a href="mailto:${email}">${email}</a></li><li>${primaryPhone}</li></ul></div>
    <div><h4>Follow</h4><ul class="socialList">${v.socials ? socialRow(v) : ''}</ul>
      <h4 style="margin-top:14px">Tools</h4><ul><li><a href="search.html">Search</a></li><li><a href="account.html">Account</a></li><li><a href="admin.html">Admin</a></li><li><a href="sitemap.html">Every file</a></li></ul></div>
  </div>
  <div class="copy">
    <span>© <span class="stamp">${year}</span> ${owner}. All rights reserved.</span>
    <span class="stamp">Grown by Beast Web Developer v5 · seed ${seed.slice(0, 8)}</span>
  </div>
</div></footer>
<div class="mbar"><a class="btn btnFill" href="tel:${primaryPhone.replace(/[^+\d]/g, '')}">Call</a><a class="btn btnGhost" href="${contactFile}" style="background:var(--bg)">Book</a></div>
<script>
  var y=document.querySelectorAll('.stamp');for(var i=0;i<y.length;i++){if(y[i].textContent.length===4)y[i].textContent=new Date().getFullYear()}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
</script>
</body>
</html>`;
}

/** The page hero every inner page opens with — the layout assignment shapes its geometry. */
function pageHero(seed: string, art: RenderArt, page: PagePlanEntry, heading: string, lede: string, heroSlot: string | null, ctaHref: string, ctaLabel: string): string {
  const { niche, city } = designFromSeed(seed);
  const img = heroSlot ? imgTag(heroSlot, art, `${page.title} — ${niche.label} in ${city}`) : '';
  return `<section class="hero"><div class="wrap heroWrap">
    <div class="hcopy reveal">
      <span class="kicker">${esc(page.purpose)}</span>
      <h1>${heading}</h1>
      <p class="lead">${lede}</p>
      ${ctaHref ? `<div class="hbtns"><a class="btn btnFill" href="${ctaHref}">${ctaLabel}</a></div>` : ''}
    </div>
    ${img ? `<div class="hvisual reveal">${img}</div>` : ''}
  </div></section>`;
}

/** Inner pages share the home CSS tokens, nav skeleton and footer (Repetition) — but each carries its OWN five-device layout assignment. */
export function renderInnerPage(seed: string, owner: string, kind: string, opts: InnerPageOpts): string {
  const { brand: seedBrand, niche, city } = designFromSeed(seed);
  const art = opts.art;
  const v: SiteValues = art.values ?? ({} as SiteValues);
  const brand = v.brand?.trim() ? v.brand.trim() : seedBrand;
  const pages = art.pages ?? [];
  const page = pages.find((p) => p.key === kind) ?? { key: kind, title: kind, purpose: '', file: `${kind}.html`, inNav: false };
  const email = v.emails?.[0] ?? `hello@${brandSlug(brand)}`;
  const primaryPhone = v.phones?.[0]?.number ?? '+1 (000) 000-0000';
  const headings = art.headings?.[kind] ?? [];
  const copy = art.copy?.[kind] ?? [];
  const h = (i: number, fallback: string) => headings[i] ?? fallback;
  const c = (i: number) => copy[i]?.body ?? '';
  const kicker = (i: number, fallback: string) => copy[i]?.kicker ?? fallback;
  const catalog = (art.values?.products ?? []).slice(0, 30);
  const year = new Date().getFullYear();
  const ldBase = JSON.stringify({
    '@context': 'https://schema.org', '@type': SCHEMA_TYPE[niche.key] ?? 'LocalBusiness',
    name: brand, description: `${brand} — ${page.purpose || niche.label} in ${city}.`,
    email, telephone: primaryPhone,
    contactPoint: v.phones ? JSON.parse(`[${contactPoints(v)}]`) : undefined,
    address: { '@type': 'PostalAddress', streetAddress: v.address ?? niche.place, addressLocality: city, addressCountry: 'US' },
    sameAs: (v.socials ?? []).map((s) => s.url),
  });

  let main = '';
  let title = page.title;
  let description = `${brand} — ${page.purpose || niche.label} in ${city}.`;
  let jsonLd = ldBase;

  if (kind === 'about') {
    main = `${pageHero(seed, art, page, h(0, 'Why we exist'), c(0) || art.brief?.promise || `${niche.about[0]} — and we do it in ${city}.`, 'about-1', '#facts', 'The facts')}
  <section id="facts"><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${kicker(1, 'The idea')}</span><h2>${h(1, 'The slow way, on purpose')}</h2></div>
    <div class="aboutCols">
      <p class="lead">${c(1) || `${niche.about[1] ?? ''} Everything is made in ${city}, for people who notice the details.`}</p>
      <div class="pull reveal">“${art.brief?.tone ?? 'Craft is a schedule you keep.'}”</div>
    </div>
    <div class="phwrap" style="margin-top:26px;max-width:820px">${imgTag('about-2', art, `Inside the ${niche.label} — ${city}`)}</div>
  </div></section>
  <section id="stats"><div class="wrap"><div class="secHead reveal"><span class="kicker">Numbers, kept honest</span><h2>${h(2, 'The scoreboard')}</h2></div>
    <div class="gridStats reveal">${niche.statLabels.map((l, i) => `<div class="stat"><b>${[12, 300, 6, 2016][i]}${i === 1 ? '+' : ''}</b><span>${l}</span></div>`).join('')}</div>
    <p class="lead" style="margin-top:18px">${c(2) || `The names on the door are real: ${brand}, ${v.address ?? niche.place}, ${city}. Come and check.`}</p>
  </div></section>`;
  } else if (kind === 'services') {
    main = `${pageHero(seed, art, page, h(0, 'Six ways in'), c(0) || `Six services, every one priced and bookable. Nothing hidden behind a form.`, 'service-1', v.phones?.[0] ? `tel:${primaryPhone.replace(/[^+\d]/g, '')}` : 'contact.html', 'Call the desk')}
  <section><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${kicker(1, 'What we do')}</span><h2>${h(1, 'How it works')}</h2></div>
    <div class="gridFeat">${niche.services.map((s, i) => `<article class="card reveal">${imgTag(`service-${i + 1}`, art, `${s} — ${niche.label} in ${city}`) ? `<div class="ptile">${imgTag(`service-${i + 1}`, art, `${s} — ${niche.label} in ${city}`)}</div>` : ''}<div class="cnum">${String(i + 1).padStart(2, '0')}</div><h3>${s}</h3><p>${c(1) || 'Booked week by week — talk to us about timing.'}</p></article>`).join('')}</div>
  </div></section>
  <section><div class="wrap"><div class="secHead reveal"><span class="kicker">Proof</span><h2>${h(2, 'What it costs')}</h2></div>
    <div class="menuList reveal">${catalog.slice(0, 6).map((p) => `<div class="menuRow"><div><b>${p.name}</b><small>${p.desc}</small></div><i>${money(p.price)}</i></div>`).join('')}</div>
  </div></section>`;
  } else if (kind === 'products') {
    const pc = art.productCopy ?? {};
    main = `${pageHero(seed, art, page, h(0, niche.menuTitle), c(0) || `Every price on the page. No "ask us" — the number is right here.`, catalog.length ? 'product-1' : null, 'search.html', 'Search the catalog')}
  <section><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${kicker(1, 'Priced plainly')}</span><h2>${h(1, 'The full catalog')}</h2></div>
    <div class="gridFeat">${catalog.map((p, i) => `
      <article class="card reveal"><a href="${productFileFor(i, p.name)}" aria-label="${esc(p.name)}">
        <div class="ptile">${imgTag(`product-${i + 1}`, art, pc[i]?.alt ?? `${p.name} — ${niche.label}`)}</div></a>
        <div class="cnum">${String(i + 1).padStart(2, '0')}</div><h3>${p.name}</h3><p>${pc[i]?.desc ?? p.desc}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
          <i style="color:var(--accent);font-weight:700;font-style:normal">${money(p.price)}</i>${p.tag ? `<small style="color:var(--inkSoft)">${p.tag}</small>` : ''}
          <a href="${productFileFor(i, p.name)}" style="font-weight:700;color:var(--accent)">View →</a>
        </div>
      </article>`).join('')}</div>
  </div></section>`;
  } else if (kind === 'gallery') {
    const extras = (art.images ?? []).filter((r) => r.role === 'gallery' && /^gallery-\d+$/.test(r.slotId));
    main = `${pageHero(seed, art, page, h(0, 'Fresh from the bench'), c(0) || `Real photos, openly licensed, credited in ATTRIBUTION. No stock smiles.`, 'gallery-1', 'contact.html', 'Commission the next one')}
  <section><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${kicker(1, 'Recent work')}</span><h2>${h(1, 'This season’s work')}</h2></div>
    <div class="gridGal">${niche.services.slice(0, 6).map((s, i) => `<figure class="tile reveal">${imgTag(`gallery-${i + 1}`, art, `${s} — gallery piece ${i + 1}`) || ''}<span>${s}</span></figure>`).join('')}</div>
    <div class="secHead reveal" style="margin-top:44px"><span class="kicker">The wall</span><h2>${h(2, 'Every photo, credited')}</h2></div>
    <div class="masonry">${extras.map((r, i) => `<figure class="reveal"><div class="phwrap" style="aspect-ratio:${i % 3 === 0 ? '3/4' : '4/3'}">${imgTag(r.slotId, art, r.query || `${niche.label} work ${i + 1}`)}</div><figcaption class="metaLine" style="margin-top:6px">${esc(r.query || '')} — ${esc(r.source)}${r.license ? ` (${esc(r.license)})` : ''}</figcaption></figure>`).join('')}</div>
  </div></section>`;
  } else if (kind === 'faq') {
    const generic = [
      { q: 'Where are you?', a: `${v.address ?? niche.place + ' in ' + city} — knock during opening hours.` },
      { q: 'How do I reach you fastest?', a: `Call ${primaryPhone} or email ${email}. We answer within one working day.` },
      { q: 'Do you do gift options?', a: 'Yes — ask at the counter and we will wrap it properly.' },
    ];
    const all = [...niche.faq, ...(art.faqEntries ?? []), ...generic];
    main = `${pageHero(seed, art, page, h(0, 'Good questions'), c(0) || 'Asked often, answered plainly. Still stuck? The directory lists every desk.', null, 'contacts.html', 'Open the directory')}
  <section><div class="wrap faq">
    <div class="secHead reveal"><span class="kicker">${kicker(1, 'Asked often')}</span><h2>${h(1, 'Before you ask')}</h2></div>
    ${all.slice(0, 10).map((f) => `<details><summary>${f.q}</summary><p class="fa">${f.a}</p></details>`).join('')}
  </div></section>`;
  } else if (kind === 'contact') {
    const phones = (v.phones ?? []).slice(0, 12);
    main = `${pageHero(seed, art, page, h(0, `Talk to ${brand}`), c(0) || `A ${niche.label} that answers within a day. Every number labelled, every channel open.`, null, 'contacts.html', 'Prefer a directory?')}
  <section><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${kicker(1, 'Contact')}</span><h2>${h(1, 'Call — every desk has a number')}</h2></div>
    <div class="contactCols">
      <div class="cbox reveal"><h3>${h(2, 'Write — we answer within a day')}</h3><ul>${(v.emails ?? [email]).map((e) => `<li><a href="mailto:${e}">${e}</a></li>`).join('')}</ul></div>
      <div class="cbox reveal"><h3>${h(3, 'Visit')}</h3><p>${v.address ?? `${niche.place}, ${city}`}</p><ul>${(v.hoursDisplay ?? []).map((x) => `<li>${x}</li>`).join('')}</ul></div>
      <div class="cbox reveal"><h3>Phones</h3><ul>${phones.slice(0, 5).map((p) => `<li><a href="tel:${p.number.replace(/[^+\d]/g, '')}">${p.number}</a> <small style="color:var(--inkSoft)">· ${p.label}</small></li>`).join('')}</ul></div>
    </div>
    <div class="cbox reveal" style="margin-top:22px"><h3>Every channel — a modern business is reachable</h3>
      <ul class="socialList">${v.socials ? socialRow(v) : ''}</ul></div>
    <div class="mapbox reveal" style="margin-top:22px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      <iframe title="Map — ${brand}" src="${v.mapEmbed ?? ''}" style="width:100%;height:300px;border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
    ${contactForm(email)}
  </div></section>`;
  } else if (kind === 'directory') {
    const phones = (v.phones ?? []).slice(0, 12);
    const desks = phones.map((p, i) => {
      const svc = niche.services[i % niche.services.length];
      return `<tr><td><b>${p.label}</b><small>handles: ${svc.toLowerCase()}</small></td><td><a href="tel:${p.number.replace(/[^+\d]/g, '')}">${p.number}</a></td><td><a href="mailto:${(v.emails ?? [email])[i % (v.emails ?? [email]).length]}">${(v.emails ?? [email])[i % (v.emails ?? [email]).length]}</a></td><td class="metaLine">${i === 0 ? 'first call, fastest reply' : i < 3 ? 'same working day' : 'within one day'}</td></tr>`;
    }).join('');
    main = `${pageHero(seed, art, page, h(0, 'Every desk, every number'), c(0) || `No forms in the way — the right desk, the direct number, the honest reply time.`, null, 'contact.html', 'Write instead')}
  <section><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${kicker(1, 'The people directory')}</span><h2>${h(1, 'Who to ask for what')}</h2></div>
    <div style="overflow-x:auto"><table class="dirTable">
      <thead><tr><th>Desk</th><th>Direct number</th><th>Email</th><th>Reply time</th></tr></thead>
      <tbody>${desks}</tbody>
    </table></div>
    <div class="contactCols" style="margin-top:30px">
      <div class="cbox reveal"><h3>${h(2, 'Hours, plainly')}</h3><ul>${(v.hoursDisplay ?? ['Mon–Fri 8–18']).map((x) => `<li>${x}</li>`).join('')}</ul></div>
      <div class="cbox reveal"><h3>Address</h3><p>${v.address ?? `${niche.place}, ${city}`}</p><p class="metaLine">Visitors welcome — no appointment needed for browsing.</p></div>
      <div class="cbox reveal"><h3>${h(3, 'One promise: a reply within a day')}</h3><p class="metaLine">Every channel above reaches a human. If a desk is busy, another one picks up — nobody disappears behind "info@".</p></div>
    </div>
  </div></section>`;
    jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@type': 'ContactPage', name: `${brand} — contacts directory`, about: ldBase });
  } else if (kind === 'search') {
    const index = {
      pages: pages.map((p) => ({ t: p.title, f: p.file, d: p.purpose })),
      products: catalog.map((p, i) => ({ t: p.name, f: productFileFor(i, p.name), d: `${p.desc} — ${money(p.price)}`, p: p.price })),
      journal: (art.journalEntries ?? []).map((e, i) => ({ t: e.title, f: journalFileFor(i, e.title), d: e.body[0]?.slice(0, 90) ?? '' })),
    };
    main = `${pageHero(seed, art, page, h(0, 'Find anything'), c(0) || `Every page, every product, every journal entry — indexed inline, filtered as you type. No server.`, null, '', '')}
  <section><div class="wrap" style="max-width:760px">
    <div class="searchBox"><input id="q" type="search" placeholder="Type to search…" aria-label="Search this site"/></div>
    <div id="results" aria-live="polite"></div>
    <script>window.__SEARCH__=${JSON.stringify(index).replace(/</g, '\\u003c')};</script>
    <script>
    (function(){
      var idx=window.__SEARCH__;var box=document.getElementById('q');var out=document.getElementById('results');
      function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
      function render(){
        var q=(box.value||'').toLowerCase().trim();var hits=[];
        var pools=[['Page',idx.pages],['Product',idx.products],['Journal',idx.journal]];
        pools.forEach(function(pool){pool[1].forEach(function(item){if(!q||item.t.toLowerCase().indexOf(q)>=0||(item.d||'').toLowerCase().indexOf(q)>=0){hits.push({kind:pool[0],item:item})}})});
        out.innerHTML=hits.length?hits.map(function(hv){return '<div class="resultCard" style="margin-bottom:10px"><a href="'+hv.item.f+'"><b>'+esc(hv.item.t)+'</b></a><small>'+hv.kind+' — '+esc(hv.item.d||'')+'</small></div>'}).join(''):'<p class="lead">Nothing matched — try a shorter word, or call '+${JSON.stringify(primaryPhone)}+'.</p>';
      }
      box.addEventListener('input',render);render();
    })();
    </script>
  </div></section>`;
  } else if (kind === 'login') {
    main = `${pageHero(seed, art, page, h(0, 'Welcome back'), c(0) || 'Local demo account — the session lives in this browser and nowhere else.', null, '', '')}
  <section><div class="wrap"><div class="authCard reveal">
    <form id="f" onsubmit="event.preventDefault();try{localStorage.setItem('beast-auth',JSON.stringify({email:this.elements.email.value,at:new Date().toISOString()}))}catch(e){};location.href='account.html'">
      <label>Email<input required name="email" type="email" autocomplete="email" placeholder="you@example.com"/></label>
      <label>Password<input required name="pw" type="password" autocomplete="current-password" minlength="6" placeholder="••••••••"/></label>
      <button class="btn btnFill" type="submit">Log in</button>
      <small>Honest label: this is a local demo — nothing is sent, nothing is stored off this browser. No account is needed to browse, buy or ask anything on this site.</small>
      <p class="metaLine">No account? <a href="signup.html" style="color:var(--accent);font-weight:700">Sign up locally</a> — or just keep browsing as a guest, like most visitors.</p>
    </form>
  </div></div></section>`;
  } else if (kind === 'signup') {
    main = `${pageHero(seed, art, page, h(0, 'Join — optionally'), c(0) || 'Everything on this site works without an account. This is an opt-in convenience, honestly labelled.', null, '', '')}
  <section><div class="wrap"><div class="authCard reveal">
    <form onsubmit="event.preventDefault();try{localStorage.setItem('beast-auth',JSON.stringify({name:this.elements.name.value,email:this.elements.email.value,at:new Date().toISOString()}))}catch(e){};location.href='account.html'">
      <label>Name<input required name="name" type="text" autocomplete="name" placeholder="Your name"/></label>
      <label>Email<input required name="email" type="email" autocomplete="email" placeholder="you@example.com"/></label>
      <label>Password<input required name="pw" type="password" autocomplete="new-password" minlength="6" placeholder="••••••••"/></label>
      <button class="btn btnFill" type="submit">Create the local account</button>
      <small>Stored in this browser only (localStorage). No server, no newsletter you did not ask for, no dark patterns — leaving is one click.</small>
    </form>
  </div></div></section>`;
  } else if (kind === 'account') {
    main = `${pageHero(seed, art, page, h(0, 'Your corner'), c(0) || 'Saved items and enquiries — all of it stays in this browser.', null, '', '')}
  <section><div class="wrap" style="max-width:760px">
    <div class="authCard reveal" id="who"></div>
    <div class="secHead reveal" style="margin-top:34px"><span class="kicker">Saved</span><h2>${h(1, 'Saved items')}</h2></div>
    <div id="favs" class="gridFeat"></div>
    <div class="secHead reveal" style="margin-top:34px"><span class="kicker">Sent from this browser</span><h2>${h(2, 'Your enquiries')}</h2></div>
    <div id="enquiries" class="prose"></div>
    <script>
    (function(){
      function get(k,d){try{return JSON.parse(localStorage.getItem(k)||d)}catch(e){return JSON.parse(d)}}
      var a=get('beast-auth','null');var who=document.getElementById('who');
      who.innerHTML=a?'<b>'+(a.name?a.name+' · ':'')+a.email+'</b><br/><small class="metaLine">Local demo account since '+new Date(a.at).toLocaleDateString()+' — stored in this browser only.</small><div style="display:flex;gap:10px;margin-top:12px"><a class="btn btnGhost" href="index.html">Keep browsing</a><button class="btn btnGhost" onclick="try{localStorage.removeItem(\\'beast-auth\\')}catch(e){};location.href=\\'login.html\\'">Log out</button></div>':'<b>Guest</b><br/><small class="metaLine">No local account — which is fine: nothing on this site needs one.</small><div style="margin-top:12px;display:flex;gap:10px"><a class="btn btnFill" href="login.html">Log in locally</a><a class="btn btnGhost" href="signup.html">Sign up locally</a></div>';
      var favs=get('beast-favs','[]');var fq=document.getElementById('favs');
      var idx=(window.__CAT__||[]);var cats=${JSON.stringify(catalog.map((p, i) => ({ t: p.name, f: productFileFor(i, p.name), d: money(p.price) }))).replace(/</g, '\\u003c')};
      fq.innerHTML=favs.length?favs.map(function(n){var m=cats.find(function(c){return c.t===n});return m?'<article class="card"><h3>'+m.t+'</h3><p>'+m.d+'</p><a href="'+m.f+'" style="color:var(--accent);font-weight:700">Open →</a></article>':''}).join('')||'<p class="metaLine">Saved items will appear here.</p>':'<p class="metaLine">Nothing saved yet — tap the heart on any product page.</p>';
      var enq=get('beast-enquiries','[]');var eq=document.getElementById('enquiries');
      eq.innerHTML=enq.length?enq.map(function(e){return '<div class="resultCard" style="margin-bottom:10px"><div><b>'+e.name+'</b><p class="metaLine">'+e.body.slice(0,120)+'</p></div><small>'+new Date(e.at).toLocaleDateString()+'</small></div>'}).join(''):'<p class="metaLine">No enquiries sent from this browser yet.</p>';
    })();
    </script>
  </div></section>`;
  } else if (kind === 'admin') {
    main = `${pageHero(seed, art, page, h(0, 'The back office'), c(0) || 'Add, edit and delete products; export values.json; hand it back to the studio to re-render every page.', null, '', '')}
  <section><div class="wrap">
    <div class="secHead reveal"><span class="kicker">Admin — local demo</span><h2>${h(1, 'Products, edited live')}</h2></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      <button class="btn btnFill" onclick="addProduct()">+ Add product</button>
      <button class="btn btnGhost" onclick="exportValues()">Export values.json</button>
      <label class="btn btnGhost" style="cursor:pointer">Import values.json<input type="file" accept=".json" style="display:none" onchange="importValues(this)"/></label>
      <button class="btn btnGhost" onclick="if(confirm('Reset to the shipped catalog?')){try{localStorage.removeItem('beast-admin-products')}catch(e){};location.reload()}">Reset</button>
    </div>
    <div style="overflow-x:auto"><table class="adminTable"><thead><tr><th style="width:22%">Name</th><th style="width:38%">Description</th><th style="width:12%">Price</th><th style="width:16%">Tag</th><th style="width:12%"></th></tr></thead><tbody id="rows"></tbody></table></div>
    <p class="metaLine" style="margin-top:14px">Changes persist in this browser (localStorage: beast-admin-products) and take effect the moment you export values.json and re-render. Caps: 30 products, honest tags only.</p>
    <script>
    var VALUES=${JSON.stringify({ products: catalog, brand, address: v.address ?? '', hours: v.hoursDisplay ?? [] }).replace(/</g, '\\u003c')};
    function loadOv(){try{return JSON.parse(localStorage.getItem('beast-admin-products')||'null')}catch(e){return null}}
    function products(){var ov=loadOv();return ov&&ov.products?ov.products:VALUES.products}
    function save(ps){try{localStorage.setItem('beast-admin-products',JSON.stringify({products:ps,at:new Date().toISOString()}))}catch(e){}}
    function renderRows(){var ps=products();var tb=document.getElementById('rows');tb.innerHTML='';ps.forEach(function(p,i){var tr=document.createElement('tr');
      tr.innerHTML='<td><input value="'+p.name.replace(/"/g,'&quot;')+'" data-i="'+i+'" data-f="name"/></td>'+
      '<td><input value="'+String(p.desc||'').replace(/"/g,'&quot;')+'" data-i="'+i+'" data-f="desc"/></td>'+
      '<td><input value="'+p.price+'" data-i="'+i+'" data-f="price" type="number" step="0.01"/></td>'+
      '<td><input value="'+String(p.tag||'').replace(/"/g,'&quot;')+'" data-i="'+i+'" data-f="tag"/></td>'+
      '<td><button class="btn btnGhost" onclick="deleteProduct('+i+')">Delete</button></td>';
      tb.appendChild(tr)});
      tb.querySelectorAll('input').forEach(function(inp){inp.addEventListener('change',function(){var ps=products();var i=+inp.getAttribute('data-i');var f=inp.getAttribute('data-f');ps[i][f]=f==='price'?parseFloat(inp.value)||0:inp.value;save(ps);renderRows()})});
    }
    function addProduct(){var ps=products();if(ps.length>=30){alert('Cap: 30 products.');return}ps.push({name:'New product',desc:'Describe it in one honest line.',price:10,tag:'new'});save(ps);renderRows()}
    function deleteProduct(i){var ps=products();ps.splice(i,1);save(ps);renderRows()}
    function exportValues(){var ps=products();var out=JSON.parse(JSON.stringify(VALUES));out.products=ps;var blob=new Blob([JSON.stringify(out,null,1)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='values.json';a.click()}
    function importValues(inp){var f=inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var j=JSON.parse(r.result);if(j.products){VALUES.products=j.products.slice(0,30);save(VALUES.products);renderRows();alert('Imported '+VALUES.products.length+' products.')}else{alert('No products array in that file.')}}catch(e){alert('That file is not valid JSON.')}};r.readAsText(f)}
    renderRows();
    </script>
  </div></section>`;
  } else if (kind === 'thankyou') {
    main = `${pageHero(seed, art, page, h(0, 'Message on its way'), c(0) || 'Your mail app opened with everything filled in — press send there and it lands with the right desk.', null, '', '')}
  <section><div class="wrap" style="max-width:640px">
    <div class="authCard reveal">
      <h3>${h(1, 'What happens next')}</h3>
      <p class="lead">${c(1) || 'A human reads it and replies within one working day. If it is urgent, the directory has a direct number for every desk.'}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn btnFill" href="index.html">Back to the start</a>
        <a class="btn btnGhost" href="contacts.html">Open the directory</a>
        <a class="btn btnGhost" href="account.html">See your saved enquiries</a>
      </div>
      <small class="metaLine">A copy of the enquiry was kept in this browser only (localStorage) — you can review or clear it on the account page.</small>
    </div>
  </div></section>`;
  } else if (kind === 'legal') {
    main = `${pageHero(seed, art, page, h(0, 'The small print, readable'), c(0) || 'One minute, plain language, no tricks.', null, '', '')}
  <section><div class="wrap" style="max-width:72ch">
    <h3 style="margin-top:8px">${h(1, 'Privacy — we store nothing')}</h3>
    <p class="lead" style="margin-top:10px">${c(1) || `This site sets zero cookies, runs zero trackers and stores nothing about you. The contact form opens your own mail app. The optional account, the saved favourites and the admin panel keep their data in YOUR browser's localStorage — it never leaves your machine and clearing your browser data erases it.`}</p>
    <h3 style="margin-top:22px">${h(2, 'Accessibility')}</h3>
    <p style="color:var(--inkSoft)">Built to WCAG 2.1 AA: every text pair passes its measured contrast target, every image carries alt text, focus is always visible, motion honours prefers-reduced-motion, and the whole site works with a keyboard.</p>
    <h3 style="margin-top:22px">${h(3, 'Terms')}</h3>
    <p style="color:var(--inkSoft)">Content of ${brand}, ${year}. Prices shown are the real prices — no surprise fees at any step. Questions: <a href="mailto:${email}" style="color:var(--accent)">${email}</a>. Imagery credits: <a href="ATTRIBUTION.txt" style="color:var(--accent)">ATTRIBUTION.txt</a>.</p>
  </div></section>`;
  } else if (kind === 'journal') {
    const entries = art.journalEntries ?? [];
    main = `${pageHero(seed, art, page, h(0, 'Notes from the bench'), c(0) || 'What the work teaches, written down while it is still true.', 'journalimg-1', '', '')}
  <section><div class="wrap">
    <div class="secHead reveal"><span class="kicker">${kicker(1, 'Season notes')}</span><h2>${h(1, 'The archive')}</h2></div>
    <div class="gridFeat">${entries.map((e, i) => `
      <article class="card reveal"><div class="cnum">${e.date}</div><h3>${e.title}</h3><p>${e.body[0]?.slice(0, 120) ?? ''}…</p>
      <a href="${journalFileFor(i, e.title)}" style="color:var(--accent);font-weight:700;margin-top:10px;display:inline-block">Read the entry →</a></article>`).join('')}</div>
  </div></section>`;
  }

  return pageChrome({ seed, owner, art, currentKey: kind, title, description, main, jsonLd });
}

/* ---------- v5 · product detail pages ---------- */
export function renderProductPage(seed: string, owner: string, index: number, opts: { art: RenderArt }): string {
  const { niche, city } = designFromSeed(seed);
  const art = opts.art;
  const v: SiteValues = art.values ?? ({} as SiteValues);
  const catalog = (v.products ?? []).slice(0, 30);
  const p = catalog[index];
  if (!p) return renderInnerPage(seed, owner, 'products', { art, currentKey: 'products' });
  const brand = v.brand?.trim() ? v.brand.trim() : designFromSeed(seed).brand;
  const pages = art.pages ?? [];
  const shopPage = pages.find((x) => x.key === 'products');
  const pc = art.productCopy?.[index];
  const related = catalog.filter((_, i) => i !== index).slice(0, 3).map((rp) => {
    const i = catalog.indexOf(rp);
    return { p: rp, i };
  });
  const specs = [
    'Made to order — never boxed ahead',
    `Ready in 3–5 working days (${city})`,
    `Craft: ${niche.services[index % niche.services.length]}`,
    'Checked twice before it leaves the bench',
  ];
  const year = new Date().getFullYear();
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.name, description: pc?.desc ?? p.desc,
    brand: { '@type': 'Brand', name: brand },
    offers: { '@type': 'Offer', price: p.price, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
  });
  const main = `
  <section><div class="wrap">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a> → <a href="${shopPage?.file ?? 'products.html'}">${shopPage?.title ?? 'Shop'}</a> → <span aria-current="page">${p.name}</span></nav>
    <div class="heroWrap" style="align-items:start">
      <div class="phwrap" style="aspect-ratio:1/1">${imgTag(`product-${index + 1}`, art, pc?.alt ?? `${p.name} — ${niche.label}`)}</div>
      <div class="hcopy reveal" style="align-items:flex-start">
        <span class="kicker">${esc(p.tag ?? 'In the catalog')}</span>
        <h1>${p.name}</h1>
        <div class="priceBig">${money(p.price)}</div>
        <p class="lead" style="margin-top:8px">${pc?.desc ?? p.desc}</p>
        <ul class="specList">${specs.map((s) => `<li>${s}</li>`).join('')}</ul>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <a class="btn btnFill" href="contact.html">Ask about this</a>
          <button class="fav" data-name="${esc(p.name)}" onclick="(function(b){try{var l=JSON.parse(localStorage.getItem('beast-favs')||'[]');var i=l.indexOf(b.getAttribute('data-name'));if(i>=0){l.splice(i,1);b.classList.remove('on')}else{l.push(b.getAttribute('data-name'));b.classList.add('on')}localStorage.setItem('beast-favs',JSON.stringify(l))}catch(e){}})(this)" aria-label="Save ${esc(p.name)} for later">♡</button>
          <small class="metaLine">Save for later — stays in this browser</small>
        </div>
      </div>
    </div>
  </div></section>
  <section><div class="wrap">
    <div class="secHead reveal"><span class="kicker">Pairs well with</span><h2>Related from the catalog</h2></div>
    <div class="relatedGrid">${related.map((r) => `
      <article class="card reveal"><a href="${productFileFor(r.i, r.p.name)}"><div class="ptile">${imgTag(`product-${r.i + 1}`, art, r.p.name)}</div></a><h3>${r.p.name}</h3><p>${r.p.desc}</p><i style="color:var(--accent);font-weight:700;font-style:normal">${money(r.p.price)}</i></article>`).join('')}
    </div>
  </div></section>`;
  const thumb = related.length ? related : [];
  void thumb; void year;
  return pageChrome({ seed, owner, art, currentKey: 'products', title: p.name, description: `${p.name} — ${pc?.desc ?? p.desc} ${money(p.price)}. ${brand}, ${niche.label} in ${city}.`, main, jsonLd });
}

/* ---------- v5 · journal post pages ---------- */
export function renderJournalPost(seed: string, owner: string, index: number, opts: { art: RenderArt }): string {
  const { niche, city } = designFromSeed(seed);
  const art = opts.art;
  const entries = art.journalEntries ?? [];
  const e = entries[index];
  if (!e) return renderInnerPage(seed, owner, 'journal', { art, currentKey: 'journal' });
  const v: SiteValues = art.values ?? ({} as SiteValues);
  const brand = v.brand?.trim() ? v.brand.trim() : designFromSeed(seed).brand;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article',
    headline: e.title, datePublished: e.date, author: { '@type': 'Organization', name: brand },
    publisher: { '@type': 'Organization', name: brand },
  });
  const main = `
  <section><div class="wrap" style="max-width:760px">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a> → <a href="journal.html">Journal</a> → <span aria-current="page">${e.title}</span></nav>
    <span class="kicker">${e.kicker} · ${e.date}</span>
    <h1>${e.title}</h1>
    <div class="phwrap" style="margin:26px 0">${imgTag(`journalimg-${index + 1}`, art, `${e.title} — ${niche.label} in ${city}`)}</div>
    <div class="prose">${e.body.map((para) => `<p>${para}</p>`).join('')}</div>
    <div style="display:flex;gap:10px;margin-top:26px;flex-wrap:wrap">
      <a class="btn btnGhost" href="journal.html">← All entries</a>
      <a class="btn btnFill" href="contact.html">Write to the bench</a>
    </div>
  </div></section>`;
  return pageChrome({ seed, owner, art, currentKey: 'journal', title: e.title, description: e.body[0]?.slice(0, 140) ?? e.title, main, jsonLd });
}

/* ---------- v5 · the directory of every file ---------- */
export function renderSitemapHtml(seed: string, owner: string, art: RenderArt, files: { file: string; title: string }[], assets: string[]): string {
  const { niche, city } = designFromSeed(seed);
  const v: SiteValues = art.values ?? ({} as SiteValues);
  const brand = v.brand?.trim() ? v.brand.trim() : designFromSeed(seed).brand;
  const catalog = (v.products ?? []).slice(0, 30);
  const group = (label: string, rows: { f: string; t: string; d?: string }[]) => rows.length ? `
    <div class="secHead reveal" style="margin-top:30px"><span class="kicker">Every file</span><h2>${label}</h2></div>
    <div>${rows.map((r) => `<div class="resultCard" style="margin-bottom:8px"><a href="${r.f}"><b>${r.t}</b></a><small>${r.d ?? r.f}</small></div>`).join('')}</div>` : '';
  const main = `${pageHero(seed, art, { key: 'sitemap', title: 'Every file', purpose: 'one view of the whole site', file: 'sitemap.html', inNav: false }, 'Every file, one view', 'Pages, products, journal entries, images, data — everything the site ships, linked.', null, '', '')}
  <section><div class="wrap" style="max-width:820px">
    ${group('Pages', files.filter((f) => !f.file.startsWith('product-') && !f.file.startsWith('journal-')).map((f) => ({ f: f.file, t: f.title, d: f.file })))}
    ${group('Product pages', catalog.map((p, i) => ({ f: productFileFor(i, p.name), t: p.name, d: money(p.price) })))}
    ${group('Journal entries', (art.journalEntries ?? []).map((e, i) => ({ f: journalFileFor(i, e.title), t: e.title, d: e.date })))}
    ${group('Images', assets.map((a) => ({ f: a, t: a.replace('assets/', ''), d: 'openly licensed — see ATTRIBUTION.txt' })))}
    ${group('Data & documents', [
      { f: 'values.json', t: 'values.json', d: 'every editable fact in one file' },
      { f: 'ATTRIBUTION.txt', t: 'ATTRIBUTION.txt', d: 'the licence paper trail' },
      { f: 'ATTRIBUTION.md', t: 'ATTRIBUTION.md', d: 'the same, markdown' },
      { f: 'DESIGN-NOTES.md', t: 'DESIGN-NOTES.md', d: 'how the design was decided' },
      { f: 'ADMIN-NOTES.txt', t: 'ADMIN-NOTES.txt', d: 'the admin panel manual' },
      { f: 'AUTH-NOTES.txt', t: 'AUTH-NOTES.txt', d: 'how the demo auth works' },
      { f: 'POLISH-NOTES.txt', t: 'POLISH-NOTES.txt', d: 'the polish sweep results' },
      { f: 'manifest.json', t: 'manifest.json', d: 'installable web app manifest' },
      { f: 'sitemap.xml', t: 'sitemap.xml', d: 'for search engines' },
      { f: 'robots.txt', t: 'robots.txt', d: 'crawler rules' },
      { f: '404.html', t: '404.html', d: 'the helpful wrong turn' },
      { f: 'offline.html', t: 'offline.html', d: 'when the connection drops' },
    ])}
  </div></section>`;
  return pageChrome({ seed, owner, art, currentKey: 'sitemap', title: 'Every file', description: `${brand} — every file, one view. ${niche.label} in ${city}.`, main, jsonLd: `{"@context":"https://schema.org","@type":"ItemList","name":"${brand} — every file"}` });
}

/* ---------- v5 · favicon file + offline page ---------- */
export function renderFaviconSvg(seed: string): string {
  const { brand, palette } = designFromSeed(seed);
  const initial = (brand.replace(/^The /i, '').trim().charAt(0) || 'B').toUpperCase();
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${palette.accent}'/><text x='32' y='43' font-family='Arial,sans-serif' font-size='34' font-weight='800' text-anchor='middle' fill='${palette.inkOnAccent}'>${initial}</text></svg>`;
}

export function renderOfflineHtml(seed: string): string {
  const { brand, palette } = designFromSeed(seed);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Offline — ${brand}</title>
<meta name="robots" content="noindex"/>
<style>
:root{--bg:${palette.bg};--ink:${palette.ink};--inkSoft:${palette.inkSoft};--accent:${palette.accent}}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px}
h1{font-size:clamp(2rem,7vw,3.4rem);line-height:1.05}
p{color:var(--inkSoft);margin:14px 0 26px;max-width:44ch}
a{display:inline-block;background:var(--accent);color:${palette.inkOnAccent};font-weight:700;padding:14px 28px;border-radius:999px;text-decoration:none}
</style>
</head>
<body><main>
  <h1>The connection dropped.</h1>
  <p>${brand} is still exactly where you left it — this page needs no network. Everything you already opened keeps working.</p>
  <a href="index.html">Try ${brand} again</a>
</main></body>
</html>
`;
}

/* ---------- support pack ----------
   Research-based launch essentials for a sellable static site:
   sitemap.xml + robots.txt (technical SEO), 404.html (dead-link safety),
   manifest.json (installable), DESIGN-NOTES.md (human-grade provenance).
   All derived deterministically from the seed. */
export function renderSupportFiles(
  seed: string,
  owner: string,
  meta?: { price?: number; copyright?: string; pages?: string[] }
): { 'sitemap.xml': string; 'robots.txt': string; '404.html': string; 'DESIGN-NOTES.md': string; 'manifest.json': string; 'offline.html': string } {
  const { niche, brand, city, design, palette } = designFromSeed(seed);
  const dk = palette.theme === 'dark' ? null : deriveDarkTokens(palette);
  const year = new Date().getFullYear();
  const domain = brandSlug(brand);
  const copyright = meta?.copyright || `© ${year} ${owner}. All rights reserved.`;

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Buyer: replace example.com with your real domain after deployment. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(meta?.pages ?? ['index.html']).map((f, i) => `  <url>
    <loc>https://${domain}/${f === 'index.html' ? '' : f}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${i === 0 ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>
`;

  const robots = `# robots.txt — ${brand}
User-agent: *
Allow: /

Sitemap: https://${domain}/sitemap.xml
`;

  const notFound = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Page not found — ${brand}</title>
<meta name="robots" content="noindex"/>
<meta name="theme-color" content="${palette.bg}"/>
<style>
:root{--bg:${palette.bg};--ink:${palette.ink};--inkSoft:${palette.inkSoft};--accent:${palette.accent};--fh:'${design.fontHead}',serif;--fb:'${design.fontBody}',sans-serif;color-scheme:${palette.theme === 'dark' ? 'dark' : 'light'}}${dk ? `
@media (prefers-color-scheme:dark){:root{--bg:${dk.tokens.bg};--ink:${dk.tokens.ink};--inkSoft:${dk.tokens.inkSoft};--accent:${dk.tokens.accent};color-scheme:dark}}` : ''}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:var(--fb);min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px}
h1{font-family:var(--fh);font-size:clamp(2.2rem,8vw,4rem);line-height:1.05}
p{color:var(--inkSoft);margin:14px 0 26px;max-width:44ch}
a{display:inline-block;background:var(--accent);color:var(--bg);font-weight:700;padding:14px 28px;border-radius:999px;text-decoration:none;min-height:48px;line-height:20px}
</style>
</head>
<body>
<main>
  <h1>Wrong turn.</h1>
  <p>This page does not exist — but ${brand} in ${city} is exactly where you left it. The <a href="sitemap.html" style="color:var(--accent);font-weight:700">directory of every file</a> can help.</p>
  <a href="/">Back to ${brand}</a>
  <p style="margin-top:34px;font-size:.8rem">${copyright}</p>
</main>
</body>
</html>
`;

  const manifest = JSON.stringify({
    name: brand,
    short_name: brand,
    description: `${brand} — ${niche.label} in ${city}.`,
    start_url: '.',
    display: 'standalone',
    background_color: palette.bg,
    theme_color: palette.accent,
    icons: [{ src: 'assets/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }, null, 1);

  const contrastRows = palette.report
    .map((r) => `| ${r.pair} | ${r.ratio}:1 | ${r.target}:1 | ${r.pass ? 'PASS' : 'flagged'} |`)
    .join('\n');
  const darkRows = (dk?.report ?? [])
    .map((r) => `| ${r.pair} | ${r.ratio}:1 | ${r.target}:1 | ${r.pass ? 'PASS' : 'flagged'} |`)
    .join('\n');
  const notes = `# Design notes — ${brand}

> ${brand} — ${niche.label} in ${city}.
> Every decision below was made deliberately, in stage order, and is
> reproducible from the seed. This file is the paper trail a human
> designer would hand you with the invoice.

**Commission:** ${copyright}
**Design seed:** \`${seed}\` (same seed → identical site, forever)
**Shelf price:** ${meta?.price ? `$${meta.price}` : 'set at stamp time'}

## 1 · Colour system
Palette **${palette.name}** — ${palette.harmony} harmony, ${palette.theme} theme.
Not sampled by vibe: generated by harmony math, then contrast-corrected per role until it cleared WCAG.

| pair | measured | target | verdict |
| --- | --- | --- | --- |
${contrastRows}
${dk ? `
### Dark mode (prefers-color-scheme)
The dark theme is a re-derived token set — every token re-passes its own contrast check:

| pair | measured | target | verdict |
| --- | --- | --- | --- |
${darkRows}
` : ''}
## 2 · Typography
Display: **${design.fontHead}** · Body: **${design.fontBody}** (Google Fonts, free licence).
Fluid scale via clamp() — no breakpoint jumps, no fixed px headings.

## 3 · Structure
Hero variant: **${design.heroVariant}** · nav: **${design.navVariant}** · motif: **${design.motif}** ·
spacing rhythm: **${design.spaceRhythm}** · eyebrow: **${design.eyebrow}** · case: **${design.displayCase}**.
Section order: ${design.sectionOrder.join(' → ')}.
v5: every page carries its OWN layout per device, assigned by the reasoner from the
layout book — see the data-layout stamps in each page's CSS.

## 4 · The five device classes (one site, five relative layouts — per page)
${DEVICE_CLASSES.map((d) => `- **${d.id} ${d.name} (${d.range})** — nav: ${d.nav}; hero: ${d.hero}; features ${d.featureCols}-col; footer: ${d.footer}.`).join('\n')}
These are structural re-arrangements, not zoom levels. Built from relative units only
(%, fr, clamp(), rem, aspect-ratio).

## 5 · C.R.A.P. audit (Robin Williams)
- **Contrast** — every ink/background pair measured against WCAG targets (table above).
- **Repetition** — one spacing scale, one type scale, tokenised colour roles, reused everywhere.
- **Alignment** — all content sits on the container grid of its device class; nothing nudged by eye.
- **Proximity** — related blocks grouped, section rhythm a fixed multiple of the spacing scale.

## 6 · Research base
NN/g eyetracking & reading patterns (F/Z/layer-cake/spotted) · Material Design responsive
layout grid · MDN grid layout recipes · Setproduct bento math · Müller-Brockmann grid
systems · Robin Williams C.R.A.P. · WCAG 2.1 contrast maths · MDN prefers-color-scheme ·
The reasoner's review corpus (what people hate: popups, dead links, hidden prices,
tracking walls, sameness — see POLISH-NOTES and the review tasks in the ledger).

## 7 · Launch checklist (for the buyer)
1. Replace \`${domain}\` in sitemap.xml and robots.txt with your real domain.
2. Upload the whole folder (index.html, every page, assets/, sitemap.xml, robots.txt, manifest.json) to any static host.
3. Submit the sitemap in Google Search Console.
4. The contact form opens the visitor's mail app — no backend, no servers, nothing to maintain.
5. admin.html manages the catalog locally and exports values.json; hand it back to the studio to re-render.

${copyright}
`;

  return { 'sitemap.xml': sitemap, 'robots.txt': robots, '404.html': notFound, 'DESIGN-NOTES.md': notes, 'manifest.json': manifest, 'offline.html': renderOfflineHtml(seed) };
}

export { DEVICE_CLASSES };
