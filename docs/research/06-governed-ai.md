# Research 06 — The Governed AI Loop (envelope → gate → interpretation)

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
