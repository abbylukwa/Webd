// Beast RNG — seeded, reproducible randomness.
// Every site is born from a 96-bit seed; same seed = same site, forever.

export type RNG = {
  seed: string;
  next: () => number; // [0,1)
  int: (min: number, max: number) => number; // inclusive
  float: (min: number, max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  pickN: <T>(arr: readonly T[], n: number) => T[];
  shuffle: <T>(arr: readonly T[]) => T[];
  chance: (p: number) => boolean;
};

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(seedStr: string): RNG {
  // hash the seed string into 32-bit state (FNV-1a style, stable)
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = mulberry32(h >>> 0);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  return {
    seed: seedStr,
    next: rand,
    int: (min, max) => Math.floor(rand() * (max - min + 1)) + min,
    float: (min, max) => rand() * (max - min) + min,
    pick,
    pickN: <T,>(arr: readonly T[], n: number): T[] => shuffle(arr).slice(0, n),
    shuffle,
    chance: (p) => rand() < p,
  };
}

export function newSeed(): string {
  const bytes = new Uint8Array(12);
  for (let i = 0; i < 12; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
