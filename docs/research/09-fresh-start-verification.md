# Research 09 — Fresh Start & the Verification Regime

**Owner directive:** "Remove the placeholder sites — starting from scratch. Make sure everything works on the Beast site."

## Findings
- v2 shipped with a 9-day simulated warm-up (the "sim-" sites). Honest product law: a studio that *earns* its shelf proves the machine works; a pre-filled shelf proves nothing.
- Deploy reality: Render wipes `BEAST_DATA_DIR` per deploy — a state file alone can never be the memory; the GitHub vault (07) is the durable layer.

## Design (implemented)
- `loadState` version gate: any pre-v3 state file (day 44, ghost sites) is **wiped** — fresh studio, DAY 0, empty shelf (C12).
- Warm-up is **opt-in**: `BEAST_WARMUP=1` keeps the demo replay for the Test Center sandbox; default is the empty studio (C13 proves both paths).
- v2 remnants deleted outright: prisma routes (state/tick/settings/download/preview/clear), scheduler.ts, archetypes.ts, generator.ts, palettes.ts, typography.ts + the old heartbeat. Heartbeat v3 pokes the idempotent day catch-up so closed-laptop days still replay.

## Verification regime
- **39-check suite** (`/api/beast/test`, `bun scripts/test-beast.ts`) across A·Generator / B·Design knowledge / C·Engine(sandboxed) — engine tests run in a throwaway `BEAST_DATA_DIR` with the offline floor, never touching live state.
- **Boot test:** standalone server → health, /control 200, DAY 0 empty state, skip-ahead commissions 3 sites.
- **Live regime after deploy:** health → self-test 39/39 → Mission Control reachable → force work days → values caps visible → shelf site ZIP → (with token) vault repo created.

## Status
- Local: 39/39 green · build clean · boot test green. Live: verified post-deploy (see DEPLOY.md).

## Live verification log — 2026-11-12 (production, webd-1-zb89.onrender.com)

- `/api/health` → 200, service ok.
- `/api/beast` → `version 3 · day 0 · 0 sites` — the studio is live and EMPTY
  (placeholder sites gone; it earns every site task by task), 112-layout
  library, GitHub/AI shown as not-configured until the owner adds env keys.
- `/api/beast/test` → **39 pass / 0 fail** (durationMs ~run-time), groups
  A·Generator, B·Design knowledge, C·Engine — identical verdicts to local.
- `/control` → Mission Control reachable (Progress / Difference / Precisions /
  AI answers / Controls).
