# Deploying the Beast Web Developer to Render

Verified locally: `bun run build` exits 0, the standalone server boots
in 62 ms, `/api/health` returns `200 {"ok":true}` and the control room
root page returns `200`.

## ROOT CAUSE FOUND (Nov 12): the HOSTNAME binding trap

Render's log signature was: build successful, then
`No open ports detected, continuing to scan...`, and the Next.js banner
printing the **pod hostname** (`srv-…-fct71:10000`) on both Local and
Network instead of `0.0.0.0`.

Mechanism, proven by reproduction:

1. Render exports `HOSTNAME=<pod-hostname>` into the service environment.
2. Next's standalone server binds to `process.env.HOSTNAME` when it is
   set (repro: `HOSTNAME=srv-test-pod-abc123 node server.js` →
   `getaddrinfo ENOTFOUND srv-test-pod-abc123` — it resolves and binds
   that name; on Render the pod name resolves, so the server lives on an
   interface Render's scanner never checks).
3. Render sees no open port → the instance hibernates → the public URL
   returns instant empty `502` while the dashboard shows the deploy as
   live.

**The fix (pick one, A is instant):**

- **A. Dashboard:** Webd-1 → *Environment* → *Environment Variables* →
  add `HOSTNAME` = `0.0.0.0` → Save. Render redeploys automatically and
  the service comes up on the public interface.
- **B. Repo:** this package.json already hardcodes it —
  `"start": "HOSTNAME=0.0.0.0 NODE_ENV=production node .next/standalone/server.js"`
  — so any start command of the form `bun run start` / `npm start` binds
  correctly regardless of dashboard configuration.
- The `render.yaml` Blueprint carries it as an env var for future
  one-click deploys.

## Why whatsapp-qr-app works while this service 502s

The two apps are different weight classes and different tenants of the
same free plan:

| | whatsapp-qr-app | Beast Web Developer (Webd) |
| --- | --- | --- |
| Architecture | Plain Express, `node server.js` | Next.js 16, standalone build |
| Build step | none (`npm install` only) | `bun install` + `next build` |
| Direct deps | 18 | ~67 |
| Free-hour appetite | runs 24/7 (a WhatsApp bot never sleeps) | only pays hours while handling traffic |

Both services draw from the **same pool of 750 free instance hours per
month**. A bot that never sleeps consumes roughly 720 of them, leaving
little to nothing for the second service — Render then suspends the other
free service, and its URL returns instant `502` with an empty body while
the dashboard still shows the old deploy as "Live". That matches the
observed behavior exactly (fast 502, 0 bytes, sub-second responses — a
cold start would instead hold the request for ~50–60 s and then serve).

## Triage checklist (in order)

1. **Suspended / out of hours** — look at the top of the service page and
   at the *Events* tab for "instance hours" or a *Suspended* banner.
   Fix: upgrade this service to a paid plan, or free up hours (pause the
   bot, or keep only one free service running), or wait for the monthly
   reset.
2. **Failed deploy** — *Events* tab, look for a red failed deploy after
   commit `c1a541d`. Exit code `137` during build means the 512 MB
   instance was OOM-killed (unlikely here — the build is light — but that
   is the signature). Re-run *Manual Deploy* after any fix.
3. **Crash at boot** — *Logs* tab, check for a repeating start/exit loop.
   Locally the server is "Ready in ~62 ms", so any crash there comes from
   environment differences, not the code.
4. **Cold start** — after 15 idle minutes a free instance spins down;
   the *next* request takes ~50–60 s to wake it. Slow-then-serve is
   normal; instant empty 502 is not.

## Recommended service settings

Matches the manual dashboard setup plus the pieces it was missing (a
health check, a Node pin, and memory insurance — the same conventions as
the whatsapp-qr-app's working `render.yaml`):

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `bun install --frozen-lockfile && bun run build` |
| Start command | `node .next/standalone/server.js` |
| Health Check Path | `/api/health` |
| Auto-Deploy | On Commit |
| Env: `NODE_VERSION` | `22.11.0` |
| Env: `BEAST_DATA_DIR` | `/opt/render/project/src/data` |
| Env: `NODE_OPTIONS` | `--max-old-space-size=400` |
| Env: `HOSTNAME` | `0.0.0.0` |

Or skip the form entirely: commit this `render.yaml`, then
Dashboard → **New + → Blueprint** → pick the repo, and all of the above
is applied in one step.

## Persistence — read before trusting the studio

The engine keeps everything in `BEAST_DATA_DIR` (default `data/`):
`beast-state.json` (day counter, owner, ledger) and `sites/`. On the free
plan Render's filesystem is **ephemeral**: every deploy and every restart
wipes it, so the studio resets to Day 1 and the owner name resets.

- **The vault (free-plan fix):** once `BEAST_GH_TOKEN` is set, the studio
  auto-creates `beast-studio-vault` on your GitHub account and commits the
  full studio state (day counter, task ledger, transcript) on every change.
  On the next cold boot it adopts that ledger — progress survives deploys.
  Each finished shelf site also gets its own repo (`beast-site-<slug>-<seed6>`)
  with every page, asset, values.json and ATTRIBUTION.md in one commit.
- No-token fallback: use **Download all** (studio header) after each work
  day and keep the ZIPs; they are the portable archive.
- Paid plan fix: attach a 1 GB disk mounted at `/var/data` and set
  `BEAST_DATA_DIR=/var/data` — the studio then survives deploys and
  redeploys indefinitely.

## v3 environment variables (the owner's switches)

| Variable | Set to | Effect |
| --- | --- | --- |
| `BEAST_GH_TOKEN` | a GitHub token (repo scope) | **The vault.** Every shelf site auto-publishes to its own repo `beast-site-<slug>-<seed6>` in one atomic commit. Without it the publish task defers (Push button retries) — the studio never blocks. |
| `BEAST_AI_VAULT` | JSON array of API keys | Enables the governed AI path (providers auto-detected by key shape: `sk-`, `sk-ant-`, `gsk_`, `AIza`, `xai-`, `sk-or-v1-`). Without it the deterministic solver runs everything. |
| `BEAST_AI` | `0` | Hard-disables AI calls even with a vault configured. |
| `BEAST_IMAGES` | `0` | Forces the offline image floor (gradients) — used by the self-test sandbox. |
| `BEAST_WARMUP` | `1` | Opt-in demo warm-up replay. Default is the empty studio (v3 fresh start). |

Add `BEAST_GH_TOKEN` / `BEAST_AI_VAULT` in the Render dashboard →
*Environment* (values are secret; `render.yaml` ships them as
`sync: false` placeholders). Tokens are used server-side only, are never
printed, stored in state, or sent to the browser. **Security note:** any
token that has appeared in chat or screenshots should be revoked and
rotated after setup.

A side effect of spin-downs is benign: the engine's date catch-up
completes any missed work days on the next boot, so an idle studio
catches up instead of falling behind.

## Maintenance window

Render upgrades critical infrastructure on **November 18th, 02:00 UTC**
(04:00 GMT+2). Builds, deploys and running services may be briefly
unavailable in that window; nothing in this repo needs to change for it.
