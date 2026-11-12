# Research 07 — GitHub-as-Storage (and the database answer)

**Owner question, answered: does storing 12 numbers / 30 products / videos / audio need a database? — NO.**

## Why no database
- The product is *static sites + assets*. Static files want file storage; a DB adds a server, migrations, backups and a second source of truth for zero owner value at this scale (a site's state fits in one JSON file; a site folder is a few hundred KB).
- A DB **stays an allowance** for a future multi-tenant marketplace phase (`BEAST_STORAGE` config seam in storage.ts docstring) — nothing in v3 requires it.

## What GitHub solves
- **Durability across ephemeral hosts** (Render wipes local disk on every deploy) — the vault outlives the container.
- **A real, inspectable archive per site** the buyer can audit: every file, commit history, license, attribution.

## Design (implemented) — `storage.ts`
- `ensureRepo(name)` — POST /user/repos, idempotent (422 → fetch existing).
- **Auto-naming law:** `beast-site-<brand-slug>-<seed6>` (e.g. `beast-site-bloom-slow-abcdef`) — the app names the repo itself; slug law verified by C8.
- `pushFilesToRepo` — **Git Data API, one atomic commit**: blobs → tree → commit (parent = current main) → ref create/update. No git binary needed inside the container.
- `publishSiteFiles` — pages, assets, values.json, ATTRIBUTION.md, LICENSE, DESIGN-NOTES in that one commit; **no token → DEFER, never block the studio** (Push button retries; C8).
- Token handling: `BEAST_GH_TOKEN` env only (Render dashboard → Environment). Never printed, never committed, never sent to the client (the UI shows a boolean, nothing else).

## Limits research (media: videos, audio, "anything")
- Contents/Git Data API: **≤ 100 MB per file**, repo soft-recommended < 1 GB, **5,000 req/h** token cap → the pipeline batches a whole site into ONE commit (≈ 15–20 API calls).
- **Git LFS free tier: 1 GB storage / 1 GB bandwidth / month** — enough for site imagery (KB–MB each), NOT for heavy video. Doctrine: sites embed media via **free CDN URLs** (Wikimedia/W3C sample media/owner-pasted links) while the *URLs and small assets* are archived in the vault; the owner can also upload media to the repo manually. This keeps every generated site fast, legal and within free quotas.
- **Studio state vault (implemented):** the app also keeps a second auto-created repo, `beast-studio-vault`, holding `beast-state.json` (day counter, task ledger, transcript, values). Every `saveState` pushes one small commit (fire-and-forget, deduped, never blocking); on a cold boot with an empty local file the studio **adopts the vaulted ledger** (`adoptVaultState`) — progress survives deploys and Render restarts. Version-gated: foreign-version payloads are rejected. Verified by self-test C14.
- Restore path: the vault's `values.json` + artifacts are sufficient to rebuild the site folder anywhere (`seed + values` determinism); rebuilt pages self-heal on first request via `getSiteHtml`. Image bytes re-fetch from the frozen determinism records' source URLs.

## Verification
- C8 (naming law + graceful defer), C5 (file set that gets pushed) — pass. Live behavior: shelf site + configured token → one commit with N files.
