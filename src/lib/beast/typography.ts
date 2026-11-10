// ══════════════════════════════════════════════════════════════════════
//  TYPOGRAPHY — typeface pairings (Lupton: two families, one voice).
//  Each pairing: a display face that carries the page + a workhorse
//  body face. Loaded in generated sites via Google Fonts with robust
//  system fallbacks so downloaded files degrade gracefully offline.
// ══════════════════════════════════════════════════════════════════════

export interface TypePairing {
  id: string;
  name: string;
  displayFamily: string; // CSS family name
  bodyFamily: string;
  googleQuery: string; // fonts.googleapis.com families=… param
  displayFallback: string;
  bodyFallback: string;
  moods: string[];
  note: string; // Lupton-style pairing rationale
}

export const TYPE_PAIRINGS: TypePairing[] = [
  {
    id: "fraunces-inter",
    name: "Fraunces × Inter",
    displayFamily: "'Fraunces', Georgia, serif",
    bodyFamily: "'Inter', -apple-system, 'Segoe UI', sans-serif",
    googleQuery: "family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600&display=swap",
    displayFallback: "Georgia, serif",
    bodyFallback: "'Segoe UI', sans-serif",
    moods: ["restaurant", "coffee", "bakery", "boutique", "wellness", "agency"],
    note: "Wonky warm serif against a neutral grotesk — personality without noise.",
  },
  {
    id: "playfair-source",
    name: "Playfair Display × Source Sans 3",
    displayFamily: "'Playfair Display', Georgia, serif",
    bodyFamily: "'Source Sans 3', -apple-system, sans-serif",
    googleQuery: "family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;600&display=swap",
    displayFallback: "Georgia, serif",
    bodyFallback: "Verdana, sans-serif",
    moods: ["law", "finance", "luxury", "weddings", "events", "realestate"],
    note: "High-contrast didone reads as establishment; the sans keeps it current.",
  },
  {
    id: "spacegrotesk-ibmplex",
    name: "Space Grotesk × IBM Plex Sans",
    displayFamily: "'Space Grotesk', 'Trebuchet MS', sans-serif",
    bodyFamily: "'IBM Plex Sans', -apple-system, sans-serif",
    googleQuery: "family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
    displayFallback: "'Trebuchet MS', sans-serif",
    bodyFallback: "'Helvetica Neue', sans-serif",
    moods: ["saas", "startup", "tech", "consulting", "finance"],
    note: "Engineered grotesk headline + plex body: precise, credible, modern.",
  },
  {
    id: "cormorant-lato",
    name: "Cormorant Garamond × Lato",
    displayFamily: "'Cormorant Garamond', Georgia, serif",
    bodyFamily: "'Lato', 'Segoe UI', sans-serif",
    googleQuery: "family=Cormorant+Garamond:wght@500;600&family=Lato:wght@400;700&display=swap",
    displayFallback: "Georgia, serif",
    bodyFallback: "'Segoe UI', sans-serif",
    moods: ["photography", "portfolio", "spa", "beauty", "weddings", "nonprofit"],
    note: "Delicate garalde gives gallery air; Lato's humanist warmth keeps it readable.",
  },
  {
    id: "archivodark-roboto",
    name: "Archivo Black × Work Sans",
    displayFamily: "'Archivo Black', 'Arial Black', sans-serif",
    bodyFamily: "'Work Sans', -apple-system, sans-serif",
    googleQuery: "family=Archivo+Black&family=Work+Sans:wght@400;500;700&display=swap",
    displayFallback: "'Arial Black', sans-serif",
    bodyFallback: "Tahoma, sans-serif",
    moods: ["fitness", "gym", "construction", "automotive", "barbershop"],
    note: "Poster-weight headline shouts; Work Sans does the quiet explaining.",
  },
  {
    id: "libre-nunito",
    name: "Libre Baskerville × Nunito Sans",
    displayFamily: "'Libre Baskerville', Georgia, serif",
    bodyFamily: "'Nunito Sans', 'Segoe UI', sans-serif",
    googleQuery: "family=Libre+Baskerville:wght@400;700&family=Nunito+Sans:wght@400;600;700&display=swap",
    displayFallback: "Georgia, serif",
    bodyFallback: "'Segoe UI', sans-serif",
    moods: ["dental", "medical", "organic", "kids", "education", "nonprofit"],
    note: "Bookish serif authority with a rounded sans that softens the clinical edge.",
  },
  {
    id: "dmserif-poppins",
    name: "DM Serif Display × Poppins",
    displayFamily: "'DM Serif Display', Georgia, serif",
    bodyFamily: "'Poppins', 'Segoe UI', sans-serif",
    googleQuery: "family=DM+Serif+Display&family=Poppins:wght@400;500;600&display=swap",
    displayFallback: "Georgia, serif",
    bodyFallback: "Verdana, sans-serif",
    moods: ["beauty", "salon", "events", "creative", "restaurant", "boutique"],
    note: "Fashion-didone display with geometric roundness — editorial but friendly.",
  },
  {
    id: "manrope-manrope",
    name: "Manrope Solo (two weights)",
    displayFamily: "'Manrope', -apple-system, sans-serif",
    bodyFamily: "'Manrope', -apple-system, sans-serif",
    googleQuery: "family=Manrope:wght@400;500;700;800&display=swap",
    displayFallback: "'Helvetica Neue', sans-serif",
    bodyFallback: "Roboto, sans-serif",
    moods: ["saas", "startup", "tech", "consulting", "finance"],
    note: "One family, weight does the hierarchy (Lupton: restraint is a choice).",
  },
];

export function pairingById(id: string): TypePairing {
  return TYPE_PAIRINGS.find((t) => t.id === id) ?? TYPE_PAIRINGS[0];
}

// Lupton rule: 1.25 modular scale, six steps, used verbatim by the generator
export const TYPE_SCALE = {
  display: "clamp(2.75rem, 6vw, 4.75rem)", // 44 → 76
  h2: "clamp(1.75rem, 3.4vw, 2.625rem)", // 28 → 42
  h3: "1.375rem", // 22
  body: "1.0625rem", // 17
  small: "0.9375rem", // 15
  micro: "0.8125rem", // 13
};
