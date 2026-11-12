# 10 — The Truthful Engine (v4)

**Date:** 2026-11-13 · **Status:** implemented, 41/41 self-tests green
**Owner directive:** "Build everything and remove nonsensical things from my project like that button … make sure it exhausts itself no matter how small the task is by giving it its all — instead of just placeholders doing an actual imaginary thing … I want the actual logs not day based, and the progress in a loading bar with pending tasks and done tasks exact as they are, with the AI responses on the other tab."

---

## 1. What was removed (the day theater)

| Removed | Why it was nonsensical |
| --- | --- |
| `Force work day` button (`action: 'skip'`) | Manual trigger of a fake calendar day; work was rationed to one task per site per day |
| `runWorkDay` / `tick` / `forceDay` / `lastRealTick` | A simulated calendar replaying "missed days" — imaginary time |
| `DAY n` badge, day-grouped log (`{ day, date, jobs }`) | Progress was reported per fictional day, not per real execution |
| `BEAST_WARMUP` placeholder path | Opt-in demo days = placeholders doing an imaginary thing |
| `acceptedDay` / `startedDay` integers | Day counters instead of real timestamps |

## 2. What replaced it (the truthful work loop)

- **`runStudio(state, { maxTasks, maxMs })`** — drains the WHOLE pending ledger:
  picks the site that has advanced the least (round-robin fairness), executes its
  next micro-task, repeats until nothing is queued or the honest budget runs out.
  Every execution is logged. `page.plan` expansions are drained too.
- **`drainExclusive`** — one mutex per process so heartbeat + API never double-work;
  reports `{ executed, remaining, jobs, skipped }` — the remainder is always true.
- **`bootStudio` / `topUp`** — an empty floor commissions immediately (up to
  `CONCURRENCY = 3`); when the ledger empties, fresh commissions refill the floor.
- **Work loop (`heartbeat.ts`)** — every 20 s: drain a bounded slice
  (6 tasks / 45 s). The studio exhausts itself continuously without any HTTP call.
- **`LogEvent`** — `{ at: ISO, siteId?, taskTitle?, message, level }`; newest first,
  cap 400. No day grouping anywhere.
- **`cycle`** — the only counter left: increments on `clear`, labels the workspace
  generation. `startedAt` is a real timestamp.
- **State version 4** — any older state file (the v3 day-theater ledger, ghost
  sites) is purged on load: fresh empty studio (test C12).

## 3. API changes (`/api/beast`)

| Action | Change |
| --- | --- |
| `work` | NEW — drains the whole ledger now (budget 400 tasks / 50 s), returns executed + remaining |
| `commission` | NEW — adds one site if the floor has a free slot |
| `skip` | REMOVED — the rush button no longer exists |
| GET | boots the studio (vault adoption → boot → background drain), returns `cycle`, `working`, `log: LogEvent[]` |

## 4. UI changes

- **Studio header:** `WORKING… / IDLE` live badge + `cycle n` (no DAY, no rush button).
- **Live progress card:** one loading bar (`done/total` exactly as the ledger says),
  pending tasks in execution order, done tasks newest first, the actual timestamped log.
- **AI answers tab (main page):** every turn — verdict, provider, raw answer,
  "It means" interpretation, "Next action", expandable envelope. Honest
  "solver floor — no keys configured" notice when `BEAST_AI_VAULT` is unset.
- **Mission Control:** `Work now — drain all pending tasks` + `Commission a site`
  replace Skip ahead; Difference tab renders the real log.
- **Kept:** Download all / per-site ZIP, Clear (confirm dialog), per-site delete,
  values editor, Preview on D1–D5, Test Center.

## 5. Proof (self-tests, group C)

- C0 fresh start · C1 boot law · C1b budgeted drain · **C1c exhaustion law**
  (0 queued left, every site stamped & shelved) · C1d ISO acceptance timestamps ·
  **C1e log truth** (every entry timestamped, no day field) · C9 idle truth + refill ·
  C12 placeholder purge · C13 no warm-up path · C14 vault adoption.
- Live production-mode verification: 237 tasks executed → 3 sites shipped
  ($670 / $1040 / $750), 0 queued, ZIP 17 files, honest GitHub defers without a token.
