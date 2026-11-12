# BEAST v3 — Deep Research & Task-by-Task Decomposition

Owner directive: micro-task granularity (not stage granularity), 20+ layouts per
device class, governed AI calls with knowledge injection, free online images,
multi-page sites with full contact realism (12 numbers, 30 products, all
socials), easy placeholder editing, GitHub as durable storage, fresh start with
no placeholder sites, and a Mission Control panel showing progress, diffs,
precision and every AI answer.

**Direct answer recorded up front: does this need a database? NO.** Sites are
static files and assets. Runtime state lives in a small JSON file; finished
sites are archived to a GitHub repository the app creates and names itself
(via `BEAST_GH_TOKEN`). A database stays an *allowance* (`BEAST_STORAGE`) for a
future multi-tenant phase — nothing in v3 requires it.

---

## 0 · How everything interlinks (read this first)

```
                 ┌────────────────────────────────────────────────┐
                 │ ENGINE (engine.ts) — one micro-task per site/day│
                 └──────┬─────────────────────────┬───────────────┘
                        │ pops next queued task    │ freezes accepted output
                        ▼                          ▼
              ┌──────────────────┐       ┌────────────────────┐
              │ TASK GRAPH       │       │ ARTIFACTS (files)  │
              │ (tasks.ts)       │──────▶│ pages/*.html,      │
              │ plan→execute→gate│       │ values.json,       │
              └───┬─────────┬────┘       │ assets/, LICENSE   │
                  │         │            └─────────┬──────────┘
     AI path      │         │ deterministic path   │
                  ▼         ▼                      ▼
        ┌──────────────┐ ┌────────────┐    ┌────────────────┐
        │ ai.ts        │ │ solver     │    │ storage.ts     │
        │ envelope +   │ │ (seeded    │    │ file driver    │
        │ interpreter  │ │ fallback)  │    │ github driver  │
        └──────┬───────┘ └────────────┘    │ (no DB needed) │
               │ callAiPool (aipool.ts)    └────────────────┘
               ▼
        transcript → Mission Control panel (page.tsx)
```

Every micro-task output is consumed by a later task's input; every artifact is
regenerable from `seed + values + accepted task outputs`; every claim is
checked by gates before it freezes. Detours (the "greet them back and keep
walking" rule) enqueue side-tasks without abandoning the parent task.

## 1 · The micro-task catalogue (replaces 7 coarse stages)

Legend: **IN** inputs · **RULES** injected governance · **KNOW** knowledge refs ·
**OUT** output contract · **GATES** acceptance checks · **FEEDS** consumers.

### T1 `brief.compose`
- IN: seed, niche. OUT: `{ audience, tone, promise, cityStory }` (schema).
- RULES: one audience, one tone, no marketing filler verbs; city must appear in
  the promise naturally. KNOW: Williams "Non-Designer's Design Book" (CRAP),
  Garrett "Elements of User Experience" (audience before pixels).
- GATES: 4 fields non-empty; tone in approved list; no superlatives ("best",
  "world-class" banned). FEEDS: every copy task (T5–T8).

### T2 `palette.lock`
- IN: seed. OUT: palette (harmony, 8 roles). RULES: harmony math first, WCAG
  correction per role (ink≥7:1, soft≥4.5:1, accent≥3:1, onAccent≥4.5:1).
- KNOW: Albers "Interaction of Color"; WCAG 2.1 contrast maths.
- GATES: existing 30-palette contrast battery. FEEDS: all rendering.

### T3 `layout.select` (per device D1–D5 → 5 tasks)
- IN: seed, device class, layout library (≥20 per device, v3). OUT: layoutId +
  1-line arrangement rationale citing the layout's source.
- RULES: brief-fit over novelty; mobile arrangement must differ structurally
  from desktop (poster-stack vs split), never a shrink.
- KNOW: NN/g eyetracking (F/Z/layer-cake/spotted); Material responsive grid;
  Müller-Brockmann. GATES: layout exists in library for that device; rationale
  non-empty. FEEDS: page.build (T10), DESIGN-NOTES.

### T4 `page.plan` — **the site map (multi-page mandate)**
- IN: niche, values caps. OUT: ordered page list with purpose per page.
- RULES: pages per niche size — small: 4–6 (home, about, services or products,
  contact, faq); large: up to 9 (+gallery, journal, testimonials, legal).
  Every page must earn its nav slot; no orphan pages.
- GATES: home first; contact present; every page has a one-line purpose;
  internal links bi-directional (checked in T10). FEEDS: T5–T10.

### T5 `heading.compose` (per page, 4 headings → 4 tasks)
- **This is the owner's exact example**: "4 headers needed for the contact
  page" → planner emits `heading.compose(contact, slot 1/4)` … `4/4`.
- IN: page purpose, brief, previous headings (anti-repetition list).
- OUT: `{ text, alt }` per slot. RULES: ≤ 60 chars; benefit- or action-led; no
  dupes across slots/pages (list injected); niche vocabulary required.
- KNOW: Krug "Don't Make Me Think" (clarity over cleverness); NN/g headlines.
- GATES: length, uniqueness vs injected list, banned-word filter.
- FEEDS: page.build (T10).

### T6 `section.copy` (per section)
- OUT: `{ kicker, body(≤70 words), fact }`. RULES: concrete nouns over
  adjectives; one fact per section; city/season real to niche.
- GATES: word count 25–70; contains one numeral or proper noun.
- FEEDS: page.build.

### T7 `image.select` (per slot: hero, gallery ×4–6, products)
- IN: slot role, niche keywords, values. OUT: chosen image record or
  `gradient-fallback`.
- SOURCES (researched): **Openverse API** (`api.openverse.org/v1/images/?q=`,
  anonymous, CC-licensed, returns license + creator + foreign_landing_url) →
  **Wikimedia Commons API** → **Picsum** seeded fallback → gradient tiles
  (offline floor). Attribution mandatory: `ATTRIBUTION.md` lists source, author,
  license, URL per image.
- RULES: download once into site assets (self-contained ZIP); store the
  chosen URL + license in state; re-renders reuse the record (determinism =
  first-fetch-wins). GATES: attribution record complete; license in
  {cc0, pdm, by, by-sa} or picsum/public fallback noted.
- FEEDS: page.build, ZIP.

### T8 `catalog.build` — **up to 30 products**
- OUT: products[] capped 30, each `{ name, desc≤90, price, tag? }`, prices
  plausible for niche priceBase (±60%), no name dupes.
- RULES: catalog pages paginated at 12 per view; every product gets an image
  slot (T7) and a price; tag vocabulary limited (house favourite, seasonal,
  limited, new).
- GATES: count ≤ 30; unique names; prices numeric. FEEDS: products page (T10),
  sitemap.

### T9 `contact.channels` — **up to 12 numbers + all socials**
- OUT: `phones[] ≤ 12` each with a department label (front desk, bookings,
  wholesale, events, press, …); `emails[]`; `socials[]` from the modern
  roster: Instagram, Facebook, X, TikTok, LinkedIn, YouTube, Pinterest,
  WhatsApp — handle derived from brand, URLs constructed; `hours`; `address`;
  **OpenStreetMap embed** (free, no key) framed in an iframe with title.
- RULES: a modern business is reachable beyond email — the roster is
  mandatory unless values override; every phone has a tel: link; WhatsApp
  uses wa.me with the primary number.
- GATES: ≥ 3 phones, ≤ 12; ≥ 6 socials; JSON-LD `contactPoint` entries match
  the phones. FEEDS: contact page (T10), JSON-LD, footer.

### T10 `page.build` (per page)
- IN: plan, headings, copy, images, catalog, channels, palette, layout.
- OUT: one standalone HTML file per page (`index.html`, `about.html`,
  `products.html`, `contact.html`, …) sharing nav/footer/tokens; relative
  links between pages; 404 + sitemap include every page.
- GATES: every internal link resolves to a generated file; nav highlights the
  current page; single shared CSS (per-site tokens) — Repetition enforced;
  D1–D5 media blocks present in every page.
- FEEDS: T11 review, T12 audit, stamp, ZIP, GitHub publish.

### T11 `page.review` (per page, produces the DIFF)
- Compares the built page against the previous revision (build 1 vs polish 2).
- OUT: `{ changed: [sections], verdict }`. RULES: polish may only touch
  motion, focus, spacing, copy — structural rewrites are a REJECT.
- The before/after is stored so Mission Control can show the diff.

### T12 `qa.audit` + T13 `site.stamp`
- QA: full CRAP + contrast + device matrix on every page (not just home).
- Stamp: freeze values, price, © ; **GitHub publish** (T14) if configured;
  license + attribution packed; shelf.

### T14 `github.publish`
- OUT: `{ repo, url, pushedAt }`. Repo name: `beast-site-{brand-slug}-{seed6}`
  under the token owner. Mechanics (researched): `POST /user/repos` →
  create blobs → create tree → create commit → update `main` ref — one commit
  per publish, no git binary needed. Files: all pages, assets, sitemap, robots,
  404, LICENSE.txt, ATTRIBUTION.md, DESIGN-NOTES.md, values.json.
- GATES: token present (`BEAST_GH_TOKEN`); publish is idempotent (re-push =
  new commit, never a fork). Graceful: no token → task marked `deferred`
  with instructions, studio keeps running.

### Detour tasks (interrupt handling — "greet back, keep walking")
- `brand.fix`: a copy task used a banned tone word → fix inline, log detour,
  continue parent same day. `fact.check`: a claim lacks a numeral/proper noun
  → verify against niche data or soften. Detours queue in front of new work
  and never spawn grandchildren (bounded, by rule).

## 2 · The AI contract (how the app "understands the AI")

Every AI call carries a five-part envelope built by the app:
1. **ROLE** — e.g. "You are the copy chief of a slow design studio."
2. **WHY** — the single task purpose ("This call exists to write heading 1 of
   4 for the contact page of a florist site").
3. **RULES** — the task rules + global law (C.R.A.P., WCAG, banned words).
4. **KNOWLEDGE** — the cited principle(s) governing this decision.
5. **CONTRACT** — "Answer with JSON only: `{\"text\": \"…\", \"alt\": \"…\"}`."

The **interpreter** (`ai.ts`) then:
- extracts JSON (tolerates fenced/bare/garbage — garbage = REFINE with reason),
- validates against the task schema (zod-shaped manual validators),
- maps to a verdict: **ACCEPT** (freeze + log) / **REFINE(reason)** (re-ask
  same task with the critique appended, max 2 attempts) / **DEFER to
  deterministic solver** (no key, or AI failed twice — the studio never
  stalls),
- logs every turn to the transcript: provider, prompt title, raw answer,
  interpretation, action, precision score.

Precision per task = gate pass ratio ×(1 − attempts penalty); per site =
mean over tasks; the panel shows both. The determinism guarantee is preserved:
**accepted outputs freeze** and re-render reproduces them byte-for-byte.

## 3 · Layout library — 12 → 100+ (≥20 per device)

Method: each layout keeps `source` (citable), `readingPattern`, `arrangement`,
C.R.A.P. notes, `mobile` collapse note, and gains `device` (D1–D5). Sources
researched and reused: NN/g eyetracking & scrolling research, Material Design
responsive layout, MDN grid recipes, Setproduct bento math, Müller-Brockmann
grid systems,refactoring-ui spatial order, plus canonical pattern families
(split, poster, editorial, ledger, bento, gallery-wall, marquee, cinematic,
diagonal, monogram…). The full inventory lives in `layouts.ts`
(`LAYOUTS.length` must be ≥ 100; the self-test enforces ≥ 20 per device).

## 4 · Values layer — "easier to change every placeholder"

One `values` object per site (editable in the UI, stored in state, exported as
`values.json` in the ZIP and repo): brand, tagline, phones (≤12, labelled),
emails, socials (8 platforms), hours, address, map, products (≤30), image
overrides, domain. The renderer reads values first and falls back to seeded
defaults — so the owner edits once and every page, JSON-LD, sitemap and ZIP
re-render. `PUT /api/beast {action:'setValues'}` validates caps before save.

## 5 · Storage — file + GitHub, DB optional

- **file** (default, zero-config): exactly today's behaviour under `data/`.
- **github**: at stamp time the app creates `beast-site-{slug}-{seed6}` and
  pushes the whole site in one commit (Git Data API). Studio state can also be
  pushed to `beast-studio-state` (one `state.json` + log) — this is the
  persistence answer for ephemeral free hosting.
- **sqlite/postgres**: the interface (`Storage`) is the allowance; drivers are
  additive, no engine code changes.

## 6 · Self-test expansion 23 → 45+

New checks: layouts ≥20 per device (5), page graph (plan per niche, links
resolve, nav highlight), catalog caps (30 max, uniqueness, price plausibility),
contact channels (12 numbers cap, ≥6 socials, JSON-LD contactPoint match),
values layer (caps enforced, edit propagates to re-render), image service
(attribution complete, offline fallback, determinism record), task graph
(decomposition counts, one-task-per-day, detour bounded), interpreter (accept
valid JSON, refine garbage, defer without keys), envelope (contains WHY /
RULES / KNOWLEDGE / CONTRACT), GitHub driver (repo naming, no-token defers,
idempotent publish), fresh-start (no placeholder sites on v3 boot).

## 7 · Owner control matrix

| Control | Where |
| --- | --- |
| Run next task now / Force work day | Mission Control + Studio header |
| Edit every placeholder value | Values editor (per site) |
| Push site / push all to GitHub | Mission Control sync panel |
| Fresh start (clear shelf + ledger) | Studio header (existing Clear) |
| AI on/off, warmup on/off, GitHub on/off | `BEAST_AI`, `BEAST_WARMUP`, `BEAST_GITHUB`, `BEAST_GH_TOKEN` env |
| Task pacing | `BEAST_TASKS_PER_DAY` (default 1 per site — the "one perfect task" rule) |

## 8 · Sources

- Openverse API (no key, CC, attribution): https://api.openverse.org/v1/ ; docs
  https://docs.openverse.org — confirmed anonymous access + rate limits.
- GitHub Git Data API multi-file commit: https://docs.github.com/rest/git
  (blobs → tree → commit → ref); repo create: https://docs.github.com/rest/repos.
- Wikimedia Commons API (fallback source): https://commons.wikimedia.org/w/api.php.
- NN/g eyetracking & reading patterns; Material Design responsive grid;
  MDN grid layout; Setproduct bento; Müller-Brockmann; Williams C.R.A.P.;
  WCAG 2.1 — carried over from the v2 research dossier (beast-research/).
