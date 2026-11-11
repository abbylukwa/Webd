# Deploying the Beast Web Developer to Render

Verified locally on 2026-11-11: `bun run build` exits 0, the standalone
server boots in 62 ms with Render's exact start command, `/api/health`
returns `200 {"ok":true}` and the control room root page returns `200`.
The code in this repo is deployable. If the Render URL does not serve,
the blocker is on the Render side — the triage below covers every cause
observed so far, in order of likelihood.

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

- Free plan workaround: use **Download all** (control-room header) after
  each work day and keep the ZIPs; they are the portable archive.
- Paid plan fix: attach a 1 GB disk mounted at `/var/data` and set
  `BEAST_DATA_DIR=/var/data` — the studio then survives deploys and
  redeploys indefinitely.

A side effect of spin-downs is benign: the engine's date catch-up
completes any missed work days on the next boot, so an idle studio
catches up instead of falling behind.

## Maintenance window

Render upgrades critical infrastructure on **November 18th, 02:00 UTC**
(04:00 GMT+2). Builds, deploys and running services may be briefly
unavailable in that window; nothing in this repo needs to change for it.
