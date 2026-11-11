# Deep research → v2 improvements & features (finalized)

Date: 2026-11-10 · Scope: whole-project review ("read the whole documents"),
improvement research, new features, feature-by-feature testing, finalization.

## Method

1. **Full-document audit.** Every source file read end-to-end: `engine.ts` (305→357
   lines), `render.ts` (532→682), `spec.ts` (296), `layouts.ts` (378), `knowledge.ts`
   (266→272), `palette.ts` (149→240), `rng.ts` (59), `page.tsx` (584→665), all 4 API
   routes, the packaging script, and the research notes. This caught issues no
   spot-check would find.
2. **Targeted web research** on five topics (sources below).
3. **Findings → features → tests.** Every improvement landed with a matching test
   in the 23-check suite before finalization.

## What the audit found (and the fixes)

| # | Finding | Severity | Fix |
| --- | --- | --- | --- |
| 1 | `render.ts` line 294 corrupted mid-expression (`middlesiddles.length`) | build-breaking | repaired to `middles[middles.length - 1]` |
| 2 | Eyebrow style `bracket` never rendered (`=== 'brack'` vs `'bracket'`) | logic bug | comparison corrected |
| 3 | `motifCss()` defined but **never called** — the 7 advertised ambient motifs rendered nothing | dead feature | wired into `buildCss()` output |
| 4 | Text-on-accent contrast solved against **white**, not against the accent (fallback axis wrong) → measured 1.95:1 failures | WCAG bug (light + dark) | `solveOnAccent()`: white/black chosen against the accent; midtone accents pushed to an extreme until one clears 4.5:1 |
| 5 | `scripts/test-layouts.ts` referenced modules deleted two iterations ago | stale | replaced by `scripts/test-beast.ts` (23 checks) |
| 6 | Old shelf sites kept serving pre-upgrade HTML | staleness | **self-healing rebuild**: sites re-render from seed when the engine version marker moves (`Beast Web Developer 2.0`) |
| 7 | Renaming the © owner left old stamps on shelved sites | requirement gap | `setOwner` now re-stamps every shelved site immediately |
| 8 | Stale packaging verify-list referenced removed files (`generator.ts`, `scheduler.ts`, …) | release risk | rewritten to the real v2 file set |

## Research topics → features shipped

### 1 · Technical SEO essentials for static sites
Sources: TeleportHQ *SEO for Static Websites* guide (launch checklist: sitemap.xml,
robots.txt, structured data, favicon, social tags, 404 handling); DigitalSkyrocket
*XML Sitemap Best Practices* (robots.txt and sitemap answer different questions);
ESEOspace *Technical SEO Guide for Small Businesses*.
→ **Shipped:** per-site `sitemap.xml` (buyer swaps one domain), `robots.txt`
referencing it, `404.html` carrying the site's own tokens (incl. dark mode), and
`DESIGN-NOTES.md` with a buyer launch checklist. JSON-LD, OG/Twitter cards and
favicon already existed — now they're *tested* (A3b).

### 2 · Dark mode done accessibly
Sources: MDN `prefers-color-scheme`; AdaGuard *Dark Mode Accessibility* (contrast
is the #1 WCAG failure; a naive dark toggle doubles the problem); Pegasus design
system (dark mode as a mode of semantic tokens, system preference as default).
→ **Shipped:** light/duotone palettes get a **re-derived dark token set** (same hue
family, own lightness curve) that re-passes its own WCAG check; embedded as a
`prefers-color-scheme` block; `color-scheme` meta + per-scheme `theme-color`;
motifs repaint via `var()` + `color-mix` so backgrounds, cards, buttons, nav and
ambient art all re-tint. Natively-dark palettes declare `color-scheme: dark`.
Verified by A5 (24 seeds, both branches) + dark pairs in the engine QA record.

### 3 · Programmatic generation at scale
Sources: dev.to *Programmatic SEO: scaling landing pages*; BCMS and Discovered Labs
programmatic-SEO roundups (one template × structured data × unique dimensions).
→ **Shipped/verified:** the seed→site pipeline is the "template × data" model;
uniqueness is now measured, not claimed (A7: 25 seeds → 25 unique SHA-1s;
A1: same seed → byte-identical rebuild). Support files make each output deployable.

### 4 · Positioning & pricing (selling the pages)
Sources: DigitalPresent *Website Design Cost 2025* ($3k–$15k typical small-business
range); Devine Digital (basic 3–5 page sites $2.5k–$4.5k).
→ **Kept:** the deterministic price formula sits deliberately at starter-tier
($90–$700) — honest for a one-page site with no backend; DESIGN-NOTES.md is the
"months of work" paper trail that justifies the invoice.

### 5 · QA practice for generated sites
Sources: NCDIT accessibility checklist for QA; TestParty accessibility QA guide;
QACraft website QA checklist 2026 (functionality, accessibility, SEO, compatibility).
→ **Shipped:** the **Test Center** — 23 automated checks mirroring professional QA
structure: generator (determinism, structure, SEO, WCAG, a11y floor), design
knowledge (layout book, device law, 12 books, stages), engine (pipeline, ZIP
integrity, catch-up, workspace ops). Runs in-app (`/api/beast/test`) and CLI
(`bun scripts/test-beast.ts`), always against a sandbox (`BEAST_DATA_DIR`).

## Feature list (v2, final)

1. Daily pipeline: 3 parallel commissions, 7 stages each, one stage per site per day.
2. Calendar catch-up: missed days replay on wake-up (cap 31), then idle.
3. D1–D5 device law: 5 structural layouts per site, tested (column ladder 1→5).
4. Live 5-device preview dialog (390 / 834 / 1280 / 1680 / 2200 px, scaled iframes).
5. Infinite-site grammar + uniqueness & determinism tests.
6. Harmony-math palettes with per-role WCAG correction, incl. text-on-accent solver.
7. Dark mode with re-derived, re-verified tokens + auto re-tinting motifs.
8. 12-pattern Layout Book with citable sources; picked per seed at wireframe stage.
9. 12-book education with machine rules; cited in the daily work log.
10. C.R.A.P. audit stored per site (5 lines incl. dark-mode verdict).
11. Support pack per site: sitemap.xml, robots.txt, 404.html, DESIGN-NOTES.md.
12. ZIPs: per-site (7 files) and shelf-wide (+catalog.txt), © everywhere.
13. © + year stamp with live-year JS; owner rename re-stamps the shelf.
14. Self-healing rebuilds on engine upgrade (version marker).
15. Test Center: 23 feature checks, in-app + CLI, sandboxed.
16. Download → clear → repeat workflow; delete single sites.
17. a11y floor: skip link, landmarks, 44px targets, focus-visible, reduced-motion, aria.

## Verification

- Suite: **23/23 pass** (CLI and HTTP).
- HTTP: every endpoint exercised (200s + 400/404 error paths, ZIP byte checks).
- Visual: studio, blueprints, knowledge, test center, 5-device preview — verified
  in a real browser; D1 vs D5 law confirmed live.
- Production build: `next build` clean, all routes compiled, smoke-tested.

## What was deliberately *not* added (and why)

- **Server-side contact forms** — generated sites are static by design; the
  mailto-form keeps hosting free and zero-maintenance for buyers.
- **Real photography** — external images would break self-containment, licences
  and the determinism guarantee; gradient art tokens keep every site complete.
- **AI-key copy sharpening (from the scraped repo's vault pattern)** — optional
  dependency on a paid key would stall the "never stops working" promise; the
  seed grammar already produces coherent niche copy. The vault pattern lives on
  as the studio-slot architecture.
- **Cron-driven generation** — the calendar catch-up (tick) already replays missed
  days exactly once; a cron would double-commission. Daily output stays honest.
