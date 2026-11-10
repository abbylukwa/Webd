# THE BEAST — Autonomous Web Studio

An app that designs and builds complete, sellable websites on its own — one deliberate
phase at a time — and stamps your copyright on every page. You download the finished
sites as ZIPs, clear the shelf, and the Beast starts the next commissions immediately.

## What it does

- **Daily website production.** Three workbenches run in parallel; each commission
  crosses 11 deliberate phases (field study → strategy → moodboard → color studies →
  type specimen → grid & wireframe → copywriting → construction → sleeping on it →
  C.R.A.P. audit → the last 2%). Progress is elapsed-time based: close the app for
  three days and it has three days of work done when you return.
- **The Layout Book.** Twelve fully specified page layouts (exact container widths,
  columns, gutters, breakpoints, reading patterns — sourced from NN/g eyetracking,
  Material Design, MDN grid layouts, Setproduct bento math, Müller-Brockmann).
- **Measured design decisions.** 8 curated palettes and 8 typeface pairings are
  auditioned per commission; every text/background pair is contrast-measured (WCAG).
- **C.R.A.P. audit** (Robin Williams): Contrast, Repetition, Alignment, Proximity are
  computed with real numbers before anything ships.
- **Your copyright everywhere.** Every generated page footer, LICENSE.txt and design
  notes carry `© {year} {your name}`. Set it once in Settings.
- **Download → clear → repeat.** Download any site as a ZIP (index.html +
  DESIGN-NOTES.md + LICENSE.txt), or download the whole shelf and clear it in one
  click. The Beast keeps building either way.
- **AI key vault (optional).** Pattern adapted from `abbylukwa/whatsapp-qr-app`
  (API_1..API_N slot pool). Add an OpenAI-compatible key in Settings and the Beast
  will use it to sharpen headlines; with zero keys it falls back to its own pen and
  never stops working. Keys are stored server-side only — the browser only ever sees
  masked values.

## Quickstart (Bun)

```bash
bun install
bun run db:generate     # generate the Prisma client
bun run db:push         # create the SQLite database (db/custom.db)
bun run dev             # http://localhost:3000
```

## Quickstart (Node)

Install Bun-free equivalents if you prefer npm:

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev             # runs next dev -p 3000
```

The database URL lives in `.env` (`DATABASE_URL=file:../db/custom.db`, resolved
relative to `prisma/schema.prisma`). Change it if you move things around.

## Configuration (in-app Settings dialog)

| Setting | Meaning |
| --- | --- |
| Copyright holder | The name stamped into every footer / license |
| Copyright note | e.g. "All rights reserved." |
| Pace | beast-minutes earned per real minute (6 = a site in ~2.5 real days; raise to fast-forward) |
| Workbenches | How many sites are built in parallel |
| Auto-respawn | When a bench frees up, accept the next commission automatically |
| API key vault | Optional OpenAI-compatible keys (slot pool, server-side only) |

## Project structure

```
src/lib/beast/
  knowledge.ts    the 12-book curriculum + the 11-phase machine
  layouts.ts      THE LAYOUT BOOK — 12 fully specified layouts (grid math + sources)
  palettes.ts     8 measured color systems
  typography.ts   8 typeface pairings (Lupton: two families, one voice)
  generator.ts    seeded decisions, C.R.A.P. audit, standalone HTML builder
  scheduler.ts    elapsed-time engine, workbenches, spawn logic, read model
  heartbeat.ts    server-side 30s tick — the Beast works while you're away
  aipool.ts       API key slot pool (whatsapp-qr-app pattern), graceful fallback
scripts/
  test-layouts.ts verification harness: builds ~480 sites, checks every layout signature
```

## Selling the output

Every shipped site is a self-contained folder — one `index.html` (no build step, no
dependencies, loads Google Fonts when online and degrades to system fonts offline)
plus design notes and a license naming you as copyright holder. Host it anywhere:
Netlify, Vercel, GitHub Pages, or plain shared hosting.

## Verification

```bash
bun run scripts/test-layouts.ts
# → ALL LAYOUT CHECKS PASS ✅ (12 layouts × 12 archetypes × 40 seeds)
```
