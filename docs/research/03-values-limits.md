# Research 03 — The Values Layer & Content Caps

**Owner directive:** "Max things: 12 contact numbers, 30 products… easy to change placeholder values. Do you need a database? yes or no."

## Findings
- Every site repeats the same human facts: brand, phones, emails, socials, hours, address, catalog, domain. In v2 these were scattered through the generator — editing meant re-generating.
- Cap research: 12 numbers covers department desks (front desk → owner) for any SMB; 30 products covers a full café/ceramics/florist menu without pagination; 8 platforms is the complete 2026 roster (Instagram, Facebook, X, TikTok, LinkedIn, YouTube, Pinterest, WhatsApp).

## Design (implemented) — `values.ts`
- One editable `SiteValues` object per site: brand, tagline, phones[≤12 with labels], emails, socials[8], hoursDisplay, address, mapEmbed (OpenStreetMap iframe — free, no key), products[≤30], domain.
- Seeded defaults: 4–12 labelled numbers, 12–30 products, all 8 socials — plausible from the seed, editable by the owner.
- **Caps are law** (`validateValues`): dedupe-first then cap (owner always keeps up to 30 *unique* products), phones sliced to 12, socials to 8, domain stripped of protocol/slash; every cap crossing is *reported*, never silent.
- **Editor roundtrip:** Mission Control → Values dialog → POST `setValues` → validate → freeze → **every built page re-renders immediately** (`engine.setValues` → `rebuildAllPages`). Brand propagation fixed: renderer prefers `values.brand` over the seed-born brand.
- **Database answer: NO** — see 07-github-storage.md.

## Verification
- C3 (caps), C10 (editor roundtrip incl. re-render), C4 (contact renders the values) — pass.
