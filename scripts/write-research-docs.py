#!/usr/bin/env python3
"""Write the docs/research per-task deep-dive set (9 files)."""
import os
BASE = "/home/z/my-project/docs/research"
os.makedirs(BASE, exist_ok=True)

DOCS = {}

DOCS["01-micro-task-graph.md"] = """# Research 01 — The Micro-Task Graph

**Owner directive:** "The way it does tasks is not professional… decompose task by task — 4 headers → now write header 1." One task per site per work day, perfected, never rushed.

## Findings
- v2 ran 7 coarse stages (brief → palette → … → stamp), one per day. Too coarse: "build" hid 40 decisions behind one log line, and nothing was auditable.
- Professional studios bill by micro-deliverable. The shopping-trip analogy (an errand list where every errand is atomic, with detours handled without abandoning the trip) maps 1:1 onto a DAG of atomic tasks.

## Design (implemented)
- `tasks.ts` — 16 task kinds: brief.compose, palette.lock, layout.select ×5 (D1–D5), page.plan, heading.compose ×4 per page, section.copy, image.select, catalog.build, contact.channels, values.freeze, page.build, page.review, qa.audit, site.stamp, github.publish (+ brand.fix / fact.check reserved).
- Every task carries: `why` (purpose), `rules[]` (governance), `knowledge[]` (citable sources), `attempts`, `precision`, `note` (last critique), `status` (queued → running → accepted/rejected/deferred).
- `page.plan` **decomposes**: accepting it spawns the per-page sub-tree — literally "4 headers → heading 1 of 4" as separate ledger entries.
- **One-task-per-site-per-day law** enforced in `engine.runSiteTask`; `runTaskNow` lets the owner run extra cycles on demand. Self-test C1b proves the law.
- Detours: `Task.detour` flag + side-quest kinds (brand.fix, fact.check) enqueue without dropping the parent; deferred publishes park and retry via the Push button (C8).

## Interlinks
- Tasks consume other tasks' frozen outputs (headings feed page.build; values feed catalog + contact + JSON-LD).
- Every turn lands in the interpretation ledger → Mission Control (see 08).
- Precision per task feeds the Precisions tab (see 08).

## Verification
- C1, C1b, C1c, B7, B6 — all pass (38/38 suite).
"""

DOCS["02-layout-library.md"] = """# Research 02 — The Layout Library (112 layouts, 20+ per device)

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
"""

DOCS["03-values-limits.md"] = """# Research 03 — The Values Layer & Content Caps

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
"""

DOCS["04-multipage-contact.md"] = """# Research 04 — Multi-Page Mandate & Contact Realism

**Owner directive:** "Real multi-page: home, about, contact… full contact info — 12 numbers, WhatsApp, every social, map."

## Findings
- One-pagers cannot carry 12 phone lines, a 30-product catalog and legal pages without becoming scroll abuse. Real SMB sites: home / about / services / shop / gallery / faq / contact / journal / legal.
- Contact realism research: schema.org `ContactPoint` per department line, `wa.me` deep links for WhatsApp, OpenStreetMap embed (free, no API key, no tracking), hours + address block, and a no-backend mailto form (static sites cannot run mail servers honestly).

## Design (implemented)
- Page map (`tasks.planPagesFor`): home always; **contact mandatory and in nav**; Shop page earned when the catalog has ≥ 8 items; gallery, faq, journal, legal per size; hard cap 9 pages (MAX_PAGES).
- `render.renderInnerPage` renders every inner page from the shared token set (Repetition law) with per-page nav highlighting.
- Contact page: ≤ 12 `tel:` links each with department label, emails, hours, address, **all 8 social platforms incl. WhatsApp deep link**, OSM `<iframe>` map, mailto enquiry form.
- JSON-LD on every page: `contactPoint` array mirrors the phone table exactly (count-checked by the suite).
- Support pack: sitemap.xml lists every generated page; robots, 404, DESIGN-NOTES, ATTRIBUTION, values.json ship in folder + ZIP + GitHub repo.

## Verification
- B6 (page-map law), C1d (disk truth), C4 (contact realism: tel counts, WhatsApp, OSM, contactPoints), C5 (multi-page ZIP) — pass.
"""

DOCS["05-media-pipeline.md"] = """# Research 05 — The Media Pipeline (free, licensed, attributed)

**Owner directive:** "Use free online images; no paid stock."

## Findings
- Licensing is the trap: scrape-generators ship stolen images. Legit free sources: **Openverse API** (CC0/PD/BY/BY-SA filter), **Wikimedia Commons** (license via imageinfo extmetadata), **Picsum** (free placeholder license), gradient art (zero rights).
- Attribution norms: creator + license + source page per image, shipped as a permanent paper trail (ATTRIBUTION.md).
- Audio/video: the same doctrine applies — free sources exist (Wikimedia Commons audio/video, Pixabay/Pexels with keys, archive.org) but hot-linking large media is fragile; **v3 archives media into the site's GitHub repo** (see 07) and renders video/audio via plain `<video>`/`<audio>` tags when values provide URLs; the values layer accepts any URL the owner pastes. LFS quota math in 07.

## Design (implemented) — `images.ts`
- Slot grammar per niche (3 queries each, graceful fallback for unknown niches).
- Resolution chain per slot: **Openverse → Wikimedia → Picsum → gradient floor**; bytes saved into `assets/<slot>.jpg`; hot-link fallback if bytes fail.
- **Determinism law:** first accepted fetch freezes into `site.art.images` — never re-searched, never reshuffled; slots already resolved are reused verbatim (C-suite forces BEAST_IMAGES=0 offline → gradients, pipeline still completes).
- Every live record: source, creator, license, source page → `attributionMarkdown` renders the paper trail.

## Verification
- A10 (attribution paper trail), A11 (query grammar), C1d (assets + ATTRIBUTION on disk), C5 (ATTRIBUTION in ZIP) — pass.
"""

DOCS["06-governed-ai.md"] = """# Research 06 — The Governed AI Loop (envelope → gate → interpretation)

**Owner directive:** "Every AI call: role, purpose, rules, knowledge, output contract… the app must understand the AI's response: this response means this, do this."

## Findings
- Raw LLM calls in generation pipelines fail in four ways: prose instead of JSON, contract drift (length/fields), style violations (marketing superlatives), provider outage. Ungoverned pipelines either ship garbage or stall.
- The fix is a contract layer: the deterministic solver is always the floor, the AI is an *enhancer* that must prove itself per call.

## Design (implemented) — `ai.ts` + `aipool.ts` + `tasks.ts`
- **Envelope** (`buildEnvelope`): ROLE / WHY THIS CALL EXISTS / RULES (violating any one makes the answer useless) / GOVERNING KNOWLEDGE (cite the principle) / FROZEN STATE (accepted facts it must not contradict) / OUTPUT CONTRACT (exact JSON shape). Verified character-by-character by C6.
- **Interpreter** (`interpretAnswer`): per-kind validators — heading ≤ 60 chars + banned-word filter (best/world-class/amazing/unbeatable/#1), body 25–70 words, brief fields complete; prose → REFINE, contract-true → ACCEPT with the artifact.
- **Verdict machine:** ACCEPT (freeze, precision 1.0) / REFINE (re-queue with the exact critique, attempts n/3) / DEFER (deterministic solver floor — zero downtime).
- **Key pool** (`aipool.ts`): numbered slots, provider auto-detect (OpenAI/Anthropic/Groq/Gemini/xAI/OpenRouter by key shape), round-robin, 5–30 min cooldown after 2 fails, auto-revive. Keys only via `BEAST_AI_VAULT` env (JSON); server-side only, never rendered.
- **Interpretation ledger:** every turn (AI or solver or IO) records provider, mode, verdict, interpretation ("what the app understood"), action ("what happened next"), precision → the AI Answers tab (08).

## Verification
- C6 (envelope + 5 interpreter verdicts), C7 (ledger integrity: every turn has verdict/action/provider/precision) — pass.
"""

DOCS["07-github-storage.md"] = """# Research 07 — GitHub-as-Storage (and the database answer)

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
- Restore path (roadmap): the vault's `values.json` + artifacts are sufficient to rebuild the site folder anywhere (`seed + values` determinism).

## Verification
- C8 (naming law + graceful defer), C5 (file set that gets pushed) — pass. Live behavior: shelf site + configured token → one commit with N files.
"""

DOCS["08-mission-control.md"] = """# Research 08 — Mission Control (the huge panel)

**Owner directive:** "A huge panel showing whole progress, difference, precisions — and the answers from the AI APIs. An app which understands the AI: with this response it means this, do this."

## Findings
- Trust requires observability: if the studio "works while you are gone" but shows nothing, the owner cannot distinguish working from broken. The panel is the product's honesty surface.
- Three axes requested — progress (where are we), difference (what changed), precision (how good is each piece) — plus the AI transcript with interpretation.

## Design (implemented) — `/control`
- **Stat strip:** overall progress %, in studio, on shelf, micro-tasks done, avg precision, QA contrast pass rate.
- **PROGRESS tab:** per-site cards — ledger progress bar with accepted/total, stage badge, price, palette, planned pages as file badges, media slot states (live/picsum/gradient), GitHub repo link, last 4 accepted tasks + next 3 queued.
- **DIFFERENCE tab:** day-by-day work log (what changed per day) + per-page revision table (rev n · lines · Δ changed lines).
- **PRECISIONS tab:** AI verdict tallies (accept/refine/defer + live-AI vs solver share), avg task precision bar, QA pairs measured, governance-gate coverage (envelope-carrying tasks / all tasks), and a **per-task precision chip map** per site (green ≥ 90%, amber lower, red deferred).
- **AI ANSWERS tab:** the **codebook** — six response-pattern cards, each "If the answer: X → It means: Y → Then: Z" (contract-true → frozen; prose → refine n/3 → solver; banned word → refine with the rule as critique; pool down → defer to floor; no GH token → defer to Push button; image miss → picsum/gradient + attribution) — followed by the full transcript: verdict badge, provider, mode, "Understood" + "Did" lines, collapsible raw answer and the full envelope that was sent.
- **CONTROLS tab:** owner rename (re-stamps © everywhere), Skip ahead (force a work day), per-site Run-next-task, per-site Publish + Push-all-to-GitHub, Values editor (12 phones / 30 products / 8 socials / hours / address / emails / brand / domain with live caps), Clear workspace behind a confirm dialog. GitHub/AI connection state shown as badges.
- Header links both ways with the studio (`/` ⇄ `/control`).

## Verification
- Route compiles + returns 200 (boot test); data comes from the same `publicState` the suite exercises (C7 ledger shape).
"""

DOCS["09-fresh-start-verification.md"] = """# Research 09 — Fresh Start & the Verification Regime

**Owner directive:** "Remove the placeholder sites — starting from scratch. Make sure everything works on the Beast site."

## Findings
- v2 shipped with a 9-day simulated warm-up (the "sim-" sites). Honest product law: a studio that *earns* its shelf proves the machine works; a pre-filled shelf proves nothing.
- Deploy reality: Render wipes `BEAST_DATA_DIR` per deploy — a state file alone can never be the memory; the GitHub vault (07) is the durable layer.

## Design (implemented)
- `loadState` version gate: any pre-v3 state file (day 44, ghost sites) is **wiped** — fresh studio, DAY 0, empty shelf (C12).
- Warm-up is **opt-in**: `BEAST_WARMUP=1` keeps the demo replay for the Test Center sandbox; default is the empty studio (C13 proves both paths).
- v2 remnants deleted outright: prisma routes (state/tick/settings/download/preview/clear), scheduler.ts, archetypes.ts, generator.ts, palettes.ts, typography.ts + the old heartbeat. Heartbeat v3 pokes the idempotent day catch-up so closed-laptop days still replay.

## Verification regime
- **38-check suite** (`/api/beast/test`, `bun scripts/test-beast.ts`) across A·Generator / B·Design knowledge / C·Engine(sandboxed) — engine tests run in a throwaway `BEAST_DATA_DIR` with the offline floor, never touching live state.
- **Boot test:** standalone server → health, /control 200, DAY 0 empty state, skip-ahead commissions 3 sites.
- **Live regime after deploy:** health → self-test 38/38 → Mission Control reachable → force work days → values caps visible → shelf site ZIP → (with token) vault repo created.

## Status
- Local: 38/38 green · build clean · boot test green. Live: verified post-deploy (see DEPLOY.md).
"""

for name, content in DOCS.items():
    with open(os.path.join(BASE, name), "w") as f:
        f.write(content)
    print("wrote", name, len(content.splitlines()), "lines")
print("ALL DOCS WRITTEN")
