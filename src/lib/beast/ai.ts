// Beast AI Contract — how the app and the AI "understand each other".
// ENVELOPE: every call carries ROLE / WHY / RULES / KNOWLEDGE / CONTRACT.
// INTERPRETER: every answer is parsed, validated, judged → ACCEPT / REFINE / DEFER.
// Nothing the AI says enters the site without passing the task gates; the
// deterministic solver is always the floor, so the studio never stalls.

import { callAiPool, parseVault, detectProvider, type VaultKey } from './aipool';

export type AiVerdict = 'ACCEPT' | 'REFINE' | 'DEFER';

export type AiTurn = {
  id: string;
  taskId: string;
  taskTitle: string;
  provider: string;          // 'openai' | 'groq' | 'deterministic-solver' | ...
  mode: 'ai' | 'solver';
  promptTitle: string;       // the WHY line
  envelope: string;          // full prompt sent (for the panel)
  raw: string;               // raw answer, truncated for storage
  interpretation: string;    // what the app understood
  verdict: AiVerdict;
  action: string;            // what happened next
  precision: number;         // 0..1 gate score for this turn
  at: string;
};

const VAULT_RAW = () => process.env.BEAST_AI_VAULT ?? '[]';

export function vaultKeys(): VaultKey[] {
  return parseVault(VAULT_RAW());
}

export function aiEnabled(): boolean {
  return process.env.BEAST_AI !== '0' && vaultKeys().some((k) => {
    const p = detectProvider(k.key);
    return (p !== 'unknown' && p !== 'custom') || !!k.base; // a known provider, or an explicit endpoint
  });
}

export type Envelope = { system: string; prompt: string; promptTitle: string };

export function buildEnvelope(opts: {
  role: string;
  why: string;
  rules: string[];
  knowledge: string[];
  state: string[];       // relevant frozen facts (brief, page, prior headings…)
  contract: string;      // exact output contract, e.g. 'JSON only: {"text": "..."}'
}): Envelope {
  const prompt = [
    `WHY THIS CALL EXISTS — ${opts.why}`,
    '',
    'RULES (violating any one makes the answer useless):',
    ...opts.rules.map((r, i) => `${i + 1}. ${r}`),
    '',
    'GOVERNING KNOWLEDGE (cite the principle, obey it):',
    ...opts.knowledge.map((k) => `- ${k}`),
    '',
    'FROZEN STATE (already accepted — never contradict it):',
    ...opts.state.map((s) => `- ${s}`),
    '',
    `OUTPUT CONTRACT — ${opts.contract}`,
    'Answer with the JSON only. No preamble, no markdown fence, no commentary.',
  ].join('\n');
  const system = `${opts.role}\nYou are part of Beast Web Developer, a slow design studio. Precision beats speed. Obey the rules and the knowledge; produce exactly the contracted output.`;
  return { system, prompt, promptTitle: opts.why };
}

/* ---------- response interpretation ---------- */
export type Interpretation<T> = { verdict: AiVerdict; artifact?: T; reason: string };

export function extractJson(text: string): unknown | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fence?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.indexOf('{');
    const end = c.lastIndexOf('}');
    if (start < 0 || end <= start) continue;
    try {
      return JSON.parse(c.slice(start, end + 1));
    } catch { /* next candidate */ }
  }
  return null;
}

function isStr(v: unknown, max = 400): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
}

/** Per-kind validators — the app side of the contract. */
export function interpretAnswer(kind: string, raw: string): Interpretation<Record<string, unknown>> {
  const data = extractJson(raw);
  if (!data || typeof data !== 'object') {
    return { verdict: 'REFINE', reason: 'answer was not parseable JSON — the contract demands JSON only' };
  }
  const d = data as Record<string, unknown>;
  const banned = /\b(best|world[- ]class|amazing|unbeatable|#1)\b/i;

  switch (kind) {
    case 'heading.compose': {
      const text = d.text;
      if (!isStr(text, 60)) return { verdict: 'REFINE', reason: 'heading missing or longer than 60 chars' };
      if (banned.test(text)) return { verdict: 'REFINE', reason: 'banned marketing word in heading' };
      return { verdict: 'ACCEPT', artifact: { text: text.trim(), alt: isStr(d.alt, 90) ? (d.alt as string).trim() : text.trim() }, reason: 'heading within contract' };
    }
    case 'section.copy': {
      const body = d.body;
      if (!isStr(body, 600)) return { verdict: 'REFINE', reason: 'body missing or wildly out of length' };
      const words = (body as string).trim().split(/\s+/).length;
      if (words < 25 || words > 90) return { verdict: 'REFINE', reason: `body is ${words} words — contract says 25–70` };
      if (banned.test(body as string)) return { verdict: 'REFINE', reason: 'banned marketing word in body' };
      return { verdict: 'ACCEPT', artifact: { kicker: isStr(d.kicker, 40) ? d.kicker : 'The work', body: (body as string).trim() }, reason: `body ${words} words, within contract` };
    }
    case 'brief.compose': {
      for (const f of ['audience', 'tone', 'promise'] as const) {
        if (!isStr(d[f], 200)) return { verdict: 'REFINE', reason: `brief field "${f}" missing` };
      }
      return { verdict: 'ACCEPT', artifact: d, reason: 'brief fields complete' };
    }
    case 'review.scan': {
      const arr = d.findings;
      if (!Array.isArray(arr) || arr.length < 5) return { verdict: 'REFINE', reason: 'findings missing or fewer than 5 — the contract demands 8-12' };
      const clean = arr.filter((f) => !!f && typeof f === 'object'
        && isStr((f as Record<string, unknown>).hate, 200)
        && isStr((f as Record<string, unknown>).demand, 200)
        && isStr((f as Record<string, unknown>).source, 200)).slice(0, 12);
      if (clean.length < 5) return { verdict: 'REFINE', reason: 'findings lack hate/demand/source text — sources are the law' };
      return { verdict: 'ACCEPT', artifact: { findings: clean }, reason: `${clean.length} sourced findings accepted` };
    }
    default:
      // generic contract: any object with a non-empty "text"
      if (isStr(d.text, 400)) return { verdict: 'ACCEPT', artifact: d, reason: 'generic text contract satisfied' };
      return { verdict: 'REFINE', reason: 'answer did not match the task contract' };
  }
}

/**
 * Run one AI attempt through the whole contract. Returns null when the pool
 * cannot answer at all (caller DEFERs to the deterministic solver).
 */
export async function askAi(env: Envelope, kind: string, timeoutMs = 12_000): Promise<{ turn: Omit<AiTurn, 'id' | 'at'>; artifact?: Record<string, unknown> } | null> {
  const keys = vaultKeys();
  if (!keys.length) return null;
  const res = await callAiPool(keys, env.system, env.prompt, timeoutMs);
  if (!res) return null;
  const interp = interpretAnswer(kind, res.text);
  return {
    turn: {
      taskId: '', taskTitle: env.promptTitle, provider: res.provider, mode: 'ai',
      promptTitle: env.promptTitle, envelope: env.prompt.slice(0, 2000), raw: res.text.slice(0, 900),
      interpretation: interp.reason, verdict: interp.verdict, action: '', precision: interp.verdict === 'ACCEPT' ? 1 : 0.35,
    },
    artifact: interp.artifact,
  };
}
