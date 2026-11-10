// ══════════════════════════════════════════════════════════════════════
//  PALETTES — curated color systems with mood tags.
//  Albers doctrine: colors are measured, never assumed. Every palette
//  ships pre-measured (contrast computed at audit time, live).
// ══════════════════════════════════════════════════════════════════════

export interface Palette {
  id: string;
  name: string;
  bg: string; // page background
  surface: string; // card / section background
  ink: string; // primary text
  soft: string; // secondary text
  accent: string; // THE accent (≤10% of surface, per Albers rule)
  onAccent: string; // text on accent
  dark: string; // deep section (footer/hero alt)
  onDark: string; // text on dark
  moods: string[]; // which archetype personalities it suits
}

export const PALETTES: Palette[] = [
  {
    id: "ember-cream",
    name: "Ember & Cream",
    bg: "#FAF7F2", surface: "#FFFFFF", ink: "#1C1917", soft: "#57534E",
    accent: "#C2410C", onAccent: "#FFF7ED", dark: "#1C1917", onDark: "#FAF7F2",
    moods: ["restaurant", "coffee", "barbershop", "bakery", "agency"],
  },
  {
    id: "forest-paper",
    name: "Forest & Paper",
    bg: "#F7F6F1", surface: "#FFFFFF", ink: "#14261C", soft: "#4B5F54",
    accent: "#166534", onAccent: "#ECFDF5", dark: "#0F2417", onDark: "#EAF6EE",
    moods: ["wellness", "landscaping", "spa", "consulting", "nonprofit"],
  },
  {
    id: "ink-saffron",
    name: "Ink & Saffron",
    bg: "#FDFBF7", surface: "#FFFFFF", ink: "#18181B", soft: "#52525B",
    accent: "#B45309", onAccent: "#FFFBEB", dark: "#18181B", onDark: "#FDFBF7",
    moods: ["portfolio", "photography", "law", "consulting", "agency"],
  },
  {
    id: "terracotta-sand",
    name: "Terracotta & Sand",
    bg: "#FBF5EF", surface: "#FFFFFF", ink: "#292524", soft: "#6B5D52",
    accent: "#B45309", onAccent: "#FEF3C7", dark: "#3B2E25", onDark: "#F8EFE4",
    moods: ["restaurant", "bakery", "wellness", "realestate", "coffee"],
  },
  {
    id: "slate-lime",
    name: "Slate & Lime",
    bg: "#F8FAF7", surface: "#FFFFFF", ink: "#0F172A", soft: "#475569",
    accent: "#4D7C0F", onAccent: "#F7FEE7", dark: "#0F172A", onDark: "#F1F5F0",
    moods: ["saas", "startup", "consulting", "fitness"],
  },
  {
    id: "plum-ivory",
    name: "Plum & Ivory",
    bg: "#FBF8F6", surface: "#FFFFFF", ink: "#2A1E2E", soft: "#63555F",
    accent: "#86198F", onAccent: "#FDF4FF", dark: "#2A1E2E", onDark: "#F9EFF5",
    moods: ["beauty", "spa", "salon", "portfolio", "events"],
  },
  {
    id: "ocean-graphite",
    name: "Deep Teal & Graphite",
    bg: "#F5F8F8", surface: "#FFFFFF", ink: "#13272B", soft: "#4A6165",
    accent: "#0F766E", onAccent: "#F0FDFA", dark: "#13272B", onDark: "#E8F2F1",
    moods: ["saas", "dental", "medical", "finance", "startup"],
  },
  {
    id: "rust-navy",
    name: "Rust & Midnight",
    bg: "#F6F4F0", surface: "#FFFFFF", ink: "#1A2332", soft: "#4E5A6E",
    accent: "#9A3412", onAccent: "#FFF7ED", dark: "#141D2E", onDark: "#F3F1EC",
    moods: ["fitness", "gym", "barbershop", "automotive", "construction"],
  },
  {
    id: "moss-flour",
    name: "Moss & Flour",
    bg: "#FAFAF5", surface: "#FFFFFF", ink: "#232B20", soft: "#5A6354",
    accent: "#65A30D", onAccent: "#F7FEE7", dark: "#232B20", onDark: "#F4F5EC",
    moods: ["bakery", "organic", "wellness", "nonprofit", "cafe"],
  },
  {
    id: "wine-linen",
    name: "Wine & Linen",
    bg: "#FBF7F5", surface: "#FFFFFF", ink: "#2D1B22", soft: "#6B5560",
    accent: "#9F1239", onAccent: "#FFF1F2", dark: "#2D1B22", onDark: "#F8EDEA",
    moods: ["restaurant", "events", "weddings", "boutique", "law"],
  },
  {
    id: "charcoal-gold",
    name: "Charcoal & Gold",
    bg: "#F8F7F4", surface: "#FFFFFF", ink: "#1F1D1A", soft: "#5C5750",
    accent: "#A16207", onAccent: "#FEFCE8", dark: "#1F1D1A", onDark: "#F5F3EE",
    moods: ["law", "finance", "realestate", "luxury", "consulting"],
  },
  {
    id: "coral-chalk",
    name: "Coral & Chalk",
    bg: "#FDF9F7", surface: "#FFFFFF", ink: "#302422", soft: "#6D5A55",
    accent: "#BE123C", onAccent: "#FFF1F2", dark: "#302422", onDark: "#FBF1EE",
    moods: ["events", "beauty", "kids", "boutique", "creative"],
  },
  {
    id: "pine-frost",
    name: "Pine & Frost",
    bg: "#F4F7F6", surface: "#FFFFFF", ink: "#152420", soft: "#48605A",
    accent: "#115E59", onAccent: "#F0FDFA", dark: "#152420", onDark: "#ECF2F0",
    moods: ["medical", "dental", "wellness", "saas", "finance"],
  },
  {
    id: "cocoa-blush",
    name: "Cocoa & Blush",
    bg: "#FAF6F4", surface: "#FFFFFF", ink: "#2B211D", soft: "#63544E",
    accent: "#C026D3", onAccent: "#FDF4FF", dark: "#2B211D", onDark: "#F7EEE9",
    moods: ["beauty", "salon", "boutique", "creative", "portfolio"],
  },
  {
    id: "steel-ember",
    name: "Steel & Ember",
    bg: "#F5F6F8", surface: "#FFFFFF", ink: "#1C2430", soft: "#516076",
    accent: "#DC2626", onAccent: "#FEF2F2", dark: "#1C2430", onDark: "#EFF2F5",
    moods: ["automotive", "construction", "fitness", "startup", "tech"],
  },
  {
    id: "olive-cream",
    name: "Olive & Cream",
    bg: "#FAF9F2", surface: "#FFFFFF", ink: "#26251A", soft: "#5E5D4C",
    accent: "#3F6212", onAccent: "#F7FEE7", dark: "#26251A", onDark: "#F5F4E8",
    moods: ["organic", "landscaping", "restaurant", "wellness", "cafe"],
  },
];

export function paletteById(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

// ─── WCAG relative-luminance contrast ratio (the Beast measures everything)
export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const rgb = [0, 1, 2].map((i) => parseInt(h.slice(i * 2, i * 2 + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
