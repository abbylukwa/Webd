// Beast Colour Lab — algorithmic palette generation.
// Not a fixed list: harmonies × hues × lightness curves × contrast correction
// = a mathematically near-infinite colour system, every one WCAG-checked.
import type { RNG } from './rng';

export type ContrastPair = { pair: string; ratio: number; target: number; pass: boolean };

export type Palette = {
  name: string;
  harmony: string;
  theme: 'light' | 'dark' | 'duotone';
  bg: string;
  bgAlt: string;
  surface: string;
  ink: string;
  inkSoft: string;
  inkOnAccent: string;
  accent: string;
  accent2: string;
  border: string;
  report: ContrastPair[];
};

/* ---------- colour math ---------- */
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(100, Math.max(0, s)) / 100;
  l = Math.min(100, Math.max(0, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const x = l - a * Math.max(-1, Math.min(Math.min(k(n) - 3, 9 - k(n)), 1));
    return Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function hexToHsl(hex: string): [number, number, number] {
  const [r0, g0, b0] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r0, g0, b0);
  const min = Math.min(r0, g0, b0);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r0) h = ((g0 - b0) / d + (g0 < b0 ? 6 : 0)) * 60;
  else if (max === g0) h = ((b0 - r0) / d + 2) * 60;
  else h = ((r0 - g0) / d + 4) * 60;
  return [h, s * 100, l * 100];
}

/* ---------- dark-mode derivation ----------
   Research rule (MDN prefers-color-scheme; AdaGuard dark-mode WCAG study):
   dark mode must be a re-derived semantic token set, not an inverted
   image — every token re-run through its own contrast pass. */
export type DarkTokens = {
  bg: string;
  bgAlt: string;
  surface: string;
  ink: string;
  inkSoft: string;
  inkOnAccent: string;
  accent: string;
  accent2: string;
  border: string;
};

export function deriveDarkTokens(p: Palette): { tokens: DarkTokens; report: ContrastPair[] } {
  const [hBg] = hexToHsl(p.bg);
  const [hAcc] = hexToHsl(p.accent);
  const [hAcc2] = hexToHsl(p.accent2);

  const bg = hslToHex(hBg, Math.min(20, hexToHsl(p.bg)[1]), 7);
  const bgAlt = hslToHex(hBg, Math.min(22, hexToHsl(p.bg)[1]), 12);
  const surface = hslToHex(hBg, Math.min(18, hexToHsl(p.bg)[1]), 16);
  const border = hslToHex(hBg, 12, 25);

  const ink = ensureContrast(hBg, 14, 93, bg, 7, 'lighten').hex;
  const inkSoft = ensureContrast(hBg, 12, 70, bg, 4.5, 'lighten').hex;

  const accentRaw = hslToHex(hAcc, Math.max(55, hexToHsl(p.accent)[1]), 62);
  let accent = contrast(accentRaw, bg) >= 3 ? accentRaw : ensureContrast(hAcc, Math.max(55, hexToHsl(p.accent)[1]), 62, bg, 3, 'lighten').hex;
  const accent2 = hslToHex(hAcc2, Math.max(35, hexToHsl(p.accent2)[1]), 48);

  // text on accent: solved on the accent axis (white vs black, else accent to an extreme)
  const black = hslToHex(hBg, 30, 8);
  const solved = solveOnAccent(accent, black, false);
  accent = solved.accent;
  const inkOnAccent = solved.inkOnAccent;

  const tokens: DarkTokens = { bg, bgAlt, surface, ink, inkSoft, inkOnAccent, accent, accent2, border };
  const report: ContrastPair[] = [
    { pair: 'dark ink / dark bg', ratio: +contrast(ink, bg).toFixed(2), target: 7, pass: contrast(ink, bg) >= 7 },
    { pair: 'dark inkSoft / dark bg', ratio: +contrast(inkSoft, bg).toFixed(2), target: 4.5, pass: contrast(inkSoft, bg) >= 4.5 },
    { pair: 'dark accent / dark bg', ratio: +contrast(accent, bg).toFixed(2), target: 3, pass: contrast(accent, bg) >= 3 },
    { pair: 'dark inkOnAccent / dark accent', ratio: +contrast(inkOnAccent, accent).toFixed(2), target: 4.5, pass: contrast(inkOnAccent, accent) >= 4.5 },
  ];
  return { tokens, report };
}

/* ---------- harmony engine ---------- */
const HARMONIES = ['analogous', 'complementary', 'triadic', 'split-complementary', 'monochrome', 'tetradic'] as const;

const HUE_NAMES: [number, string][] = [
  [0, 'Crimson'], [15, 'Ember'], [30, 'Amber'], [45, 'Saffron'], [60, 'Citron'],
  [80, 'Moss'], [100, 'Fern'], [130, 'Jade'], [155, 'Verdigris'], [175, 'Lagoon'],
  [190, 'Glacier'], [205, 'Harbor'], [225, 'Dusk'], [250, 'Iris'], [270, 'Amethyst'],
  [290, 'Orchid'], [310, 'Fuchsia'], [330, 'Rosewood'], [345, 'Garnet'],
];

function hueName(h: number): string {
  let best = HUE_NAMES[0];
  let bd = 999;
  for (const [hh, name] of HUE_NAMES) {
    const d = Math.min(Math.abs(h - hh), 360 - Math.abs(h - hh));
    if (d < bd) {
      bd = d;
      best = [hh, name];
    }
  }
  return best[1];
}

function accentHues(base: number, harmony: string): [number, number] {
  switch (harmony) {
    case 'analogous': return [(base + 30) % 360, (base + 350) % 360];
    case 'complementary': return [(base + 180) % 360, (base + 170) % 360];
    case 'triadic': return [(base + 120) % 360, (base + 240) % 360];
    case 'split-complementary': return [(base + 150) % 360, (base + 210) % 360];
    case 'tetradic': return [(base + 90) % 360, (base + 180) % 360];
    default: return [(base + 12) % 360, (base + 348) % 360]; // monochrome drift
  }
}

/** Nudge lightness (and slight chroma) until a pair clears its WCAG target. */
function ensureContrast(h: number, s: number, l: number, against: string, target: number, dir: 'darken' | 'lighten'): { hex: string; l: number } {
  let cur = l;
  let hex = hslToHex(h, s, cur);
  for (let i = 0; i < 60 && contrast(hex, against) < target; i++) {
    cur = dir === 'darken' ? cur - 1 : cur + 1;
    if (cur < 2 || cur > 98) break;
    hex = hslToHex(h, s, cur);
  }
  return { hex, l: cur };
}

/**
 * Text-on-accent, solved on the correct axis (Williams C — measured, never eyeballed).
 * Pick white or black — whichever clears 4.5:1 against the accent. If NEITHER does,
 * the accent itself is a midtone: push it toward an extreme (away from the bg's
 * luminance, which also keeps accent/bg ≥ 3:1) until one of them clears, then re-choose.
 */
function solveOnAccent(accentHex: string, blackHex: string, bgIsLight: boolean): { accent: string; inkOnAccent: string } {
  const white = '#ffffff';
  let accent = accentHex;
  const [, , l0] = hexToHsl(accentHex);
  let l = l0;
  for (let i = 0; i < 60 && contrast(white, accent) < 4.5 && contrast(blackHex, accent) < 4.5; i++) {
    l = bgIsLight ? Math.max(2, l - 2) : Math.min(98, l + 2);
    accent = hslToHex(hexToHsl(accentHex)[0], hexToHsl(accentHex)[1], l);
  }
  const inkOnAccent = contrast(white, accent) >= 4.5 ? white : blackHex;
  return { accent, inkOnAccent };
}

export function buildPalette(rng: RNG): Palette {
  const theme = rng.pick(['light', 'light', 'dark', 'duotone'] as const);
  const harmony = rng.pick(HARMONIES);
  const baseHue = rng.int(0, 359);
  const [hue2, hue3] = accentHues(baseHue, harmony);
  const name = `${hueName(baseHue)} ${rng.pick(['Dusk', 'Atelier', 'Foundry', 'Garden', 'Tide', 'Ember', 'Studio', 'Vista', 'Rally', 'Quarry'])}`;

  const bg = theme === 'dark' ? hslToHex(baseHue, rng.int(8, 18), rng.int(6, 10))
    : theme === 'duotone' ? hslToHex(baseHue, rng.int(14, 24), rng.int(94, 96))
    : hslToHex(baseHue, rng.int(6, 14), rng.int(96, 98));
  const bgAlt = theme === 'dark' ? hslToHex(baseHue, rng.int(10, 20), rng.int(11, 15))
    : hslToHex(baseHue, rng.int(8, 16), rng.int(91, 94));
  const surface = theme === 'dark' ? hslToHex(baseHue, rng.int(10, 18), rng.int(14, 18)) : '#ffffff';

  // ink: same hue family, contrast-corrected against bg (aim AA ≥ 4.5, we target 7)
  const inkHue = theme === 'dark' ? baseHue : baseHue;
  const ink = ensureContrast(inkHue, rng.int(10, 22), theme === 'dark' ? 92 : 14, bg, 7, theme === 'dark' ? 'lighten' : 'darken').hex;
  const inkSoft = ensureContrast(inkHue, rng.int(8, 16), theme === 'dark' ? 68 : 34, bg, 4.5, theme === 'dark' ? 'lighten' : 'darken').hex;

  // accents: vivid but legible as large/UI colour on bg (≥ 3:1)
  const a1s = rng.int(52, 88);
  const accentRaw = hslToHex(hue2, a1s, theme === 'dark' ? rng.int(55, 68) : rng.int(38, 52));
  let accent = contrast(accentRaw, bg) >= 3
    ? accentRaw
    : ensureContrast(hue2, a1s, theme === 'dark' ? 62 : 42, bg, 3, theme === 'dark' ? 'lighten' : 'darken').hex;
  const accent2 = hslToHex(hue3, rng.int(30, 60), theme === 'dark' ? rng.int(40, 55) : rng.int(30, 45));

  // text on accent: solved on the accent axis itself (white vs black, else accent pushed to an extreme)
  const black = hslToHex(baseHue, 30, 8);
  const solved = solveOnAccent(accent, black, theme !== 'dark');
  accent = solved.accent;
  const inkOnAccent = solved.inkOnAccent;

  const border = theme === 'dark' ? hslToHex(baseHue, rng.int(8, 14), rng.int(22, 28)) : hslToHex(baseHue, rng.int(8, 14), rng.int(84, 88));

  const report: ContrastPair[] = [
    { pair: 'ink / bg', ratio: +contrast(ink, bg).toFixed(2), target: 7, pass: contrast(ink, bg) >= 7 },
    { pair: 'inkSoft / bg', ratio: +contrast(inkSoft, bg).toFixed(2), target: 4.5, pass: contrast(inkSoft, bg) >= 4.5 },
    { pair: 'accent / bg', ratio: +contrast(accent, bg).toFixed(2), target: 3, pass: contrast(accent, bg) >= 3 },
    { pair: 'inkOnAccent / accent', ratio: +contrast(inkOnAccent, accent).toFixed(2), target: 4.5, pass: contrast(inkOnAccent, accent) >= 4.5 },
  ];

  return { name, harmony, theme, bg, bgAlt, surface, ink, inkSoft, inkOnAccent, accent, accent2, border, report };
}
