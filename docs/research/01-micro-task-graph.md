# Research 01 — The Micro-Task Graph

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
- C1, C1b, C1c, B7, B6 — all pass (39/39 suite).
