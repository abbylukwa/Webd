# Feature-by-feature test report — THE BEAST v2.0 (final)

Runners:
- CLI: `bun scripts/test-beast.ts` → **23/23 PASS**
- HTTP: `GET /api/beast/test` on the production build → **23/23 PASS**
- Suite source: `src/lib/beast/selftest.ts` (engine tests run in a throwaway
  `BEAST_DATA_DIR` sandbox; live studio state is never touched)

## A · Generator — 11/11 PASS

| ID | Feature | Result | Evidence |
| --- | --- | --- | --- |
| A1 | Seed determinism — same seed, identical site, forever | PASS | re-render byte-identical (~25 KB) |
| A1b | Different seeds produce different sites | PASS | distinct brands per seed |
| A2 | One site → five structural device layouts (D1–D5) | PASS | all 5 breakpoint layers + column laws 1→5 + D1 extras present |
| A3 | Rich one-page structure — 7+ sections, semantic landmarks | PASS | header/main/footer/nav/skip/form; faq↔details consistent |
| A3b | SEO pack — meta, OG/Twitter cards, JSON-LD, favicon | PASS | JSON-LD parses against schema.org |
| A4 | WCAG contrast — every palette role passes (30 palettes × 4 roles) | PASS | ink≥7:1, soft≥4.5:1, accent≥3:1, onAccent≥4.5:1 |
| A5 | Dark mode — prefers-color-scheme, re-derived + re-verified tokens | PASS | adaptive + native-dark branches both verified over 24 seeds |
| A6 | © + year injected — stamp, live-year JS, design notes | PASS | footer stamp + auto-year + DESIGN-NOTES © |
| A7 | Infinite possible sites — 25 seeds, 25 unique builds | PASS | 25/25 unique SHA-1s, relative units everywhere |
| A8 | Ambient motifs painted (all 7 variants wired) | PASS | grain/blobs/grid/rings/waves/dots/arc render |
| A9 | Accessibility floor — 44px targets, focus rings, reduced motion, aria | PASS | all markers present, no untagged imgs |

## B · Design knowledge — 5/5 PASS

| ID | Feature | Result | Evidence |
| --- | --- | --- | --- |
| B1 | Layout Book — 12 fully specified, sourced layouts | PASS | geometry + source + C.R.A.P. mapping each |
| B2 | Device law — D1–D5 strictly increasing column ladder | PASS | 1→2→3→4→5 columns; previews 390→2200px |
| B3 | 12-book education — doctrine + machine rules per book | PASS | 12/12 (Williams now carries 5 executable rules) |
| B4 | Stage law — 7 deliberate stages, one per work day | PASS | brief → palette → wireframe → build → polish → QA → stamp |
| B5 | Niche grammar — 12 niches × 6 services × 2 FAQs × 2 quotes | PASS | 12 niches verified |

## C · Engine (sandboxed) — 7/7 PASS

| ID | Feature | Result | Evidence |
| --- | --- | --- | --- |
| C1 | Daily pipeline — one stage/day, 3 parallel, no rushing | PASS | 9 days → 3 shipped, 3/3 slots busy |
| C1b | Shipped site — price, © stamp, all 5 files on disk | PASS | index + sitemap + robots + 404 + DESIGN-NOTES |
| C2 | QA record — CRAP + 4 breakpoints + dark pairs stored | PASS | contrast 4/4, breakpoints 4/4, 5 CRAP lines |
| C3 | Per-site ZIP — index + support pack + LICENSE (© inside) | PASS | 7 entries, © verified in LICENSE.txt |
| C4 | Download-all ZIP — every site folder + catalog | PASS | catalog.txt carries © lines |
| C5 | Day catch-up — missed days replay once, then idle | PASS | 3 missed days → 3 work days, second tick idle |
| C6 | Workspace ops — rename, delete one, clear-all | PASS | 0 sites, 0 dirs left; owner renamed |

## HTTP-level verification (production build)

| Endpoint | Result |
| --- | --- |
| `GET /` (UI) | 200 |
| `GET /api/beast` | 200 — day counter, sites, devices, stages |
| `POST /api/beast {skip}` | 200 — day advanced, 3 jobs logged |
| `POST /api/beast {setOwner}` | 200 — every shelved site re-stamped (verified in served HTML), then restored |
| `POST /api/beast {unknown}` | 400 |
| `GET /api/beast/site/[id]` | 200 — self-heal triggered for pre-v2 builds (dark block, JSON-LD, marker present) |
| `GET /api/beast/site/[id]/zip` | 200 — 7 entries, valid XML sitemap, WCAG tables in DESIGN-NOTES |
| `GET /api/beast/zip-all` | 200 — all site folders + catalog |
| `GET /api/beast/test` | 200 — 23/23 |
| `DELETE /api/beast/site/[id]` (missing) | 404 |

## Visual verification (real browser)

- Studio tab: daily progress schedule, stage tracks, work log citing books, shelf cards.
- Blueprints tab: 12-pattern Layout Book + D1–D5 device law with wireframe diagrams.
- Test Center: run in-app → 23/23 with per-feature PASS badges and detail lines.
- Preview dialog: live iframe at all five device widths; D1 hero law ("Poster stack")
  vs D5 ("Cinematic full-bleed: monumental centered type") confirmed live.

**Verdict: every feature tested, all passing. Project finalized.**
