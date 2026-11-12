# Research 02 — The Layout Library (112 layouts, 20+ per device)

**Owner directive:** "20+ layouts per device, minimum" — re-arrangement per device, not shrinkage.

## Findings
- v2 had 12 named layouts with a single "mobile" note. Any real studio chooses structure per breakpoint: nav, hero axis, grid columns, footer model all change.
- Sources worth citing per layout: Müller-Brockmann (Grid Systems, 1961), NN/g eyetracking reports (F/Z/layer-cake/spotted patterns), Robin Williams C.R.A.P., editorial systems ( newspapers, poster minimalism).

## Design (implemented)
- `layouts.ts`: **12 core (v2 canon) + 100 expanded tuples = 112 layouts**. Per-device: D1 20, D2 20, D3 24, D4 24, D5 24.
- Each tuple: name, description, reading pattern, hero mode, section order, mobile law, best-for niches, D1 law. Every layout carries a **citable source** and a C.R.A.P. mapping.
- Task `layout.select` picks per device from `layoutsForDevice(d)` (pool ≥ 20), must cite the source in the rationale, and must be structurally different from other devices.
- `LAYOUTS.length` flows into the ZIP LICENSE ("112-layout library") — dynamic, never hardcoded.

## Verification
- B1 (per-device ≥ 20, all sourced), A2 (D1–D5 structural layers), A7 (25 seeds → 25 unique builds) — pass.
