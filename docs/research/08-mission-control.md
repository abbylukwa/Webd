# Research 08 — Mission Control (the huge panel)

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
