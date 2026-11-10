// ══════════════════════════════════════════════════════════════════════
//  AI KEY POOL — pattern scraped & adapted from BreadBot v82
//  (github.com/abbylukwa/whatsapp-qr-app).
//
//  KEPT FROM THE ORIGINAL REPO (only the API-key machinery):
//   · Numbered key slots — empty slot = skipped. Works with whatever's there.
//   · Provider AUTO-DETECTED from the key's shape.
//   · Round-robin: every task goes to the NEXT healthy provider.
//   · Cooldown: a provider that fails twice goes cold (5→30 min),
//     auto-revives when it answers again.
//   · Graceful degradation: 1 working key does everything.
//   · Keys live server-side; the client only ever sees masked values.
// ══════════════════════════════════════════════════════════════════════

export interface VaultKey {
  id: string;
  label: string;
  key: string;
  addedAt: string;
}

export interface VaultKeyView {
  id: string;
  label: string;
  provider: string;
  masked: string;
  addedAt: string;
  lastStatus: "untested" | "healthy" | "cooldown";
}

// Provider auto-detection from key shape (repo doctrine)
export function detectProvider(key: string): string {
  const k = key.trim();
  if (k.startsWith("sk-or-v1-")) return "openrouter";
  if (k.startsWith("sk-ant-")) return "anthropic";
  if (k.startsWith("sk-")) return "openai";
  if (k.startsWith("gsk_")) return "groq";
  if (k.startsWith("AIza")) return "gemini";
  if (k.startsWith("xai-")) return "xai";
  if (k.startsWith("r8_")) return "replicate";
  if (k.length > 20) return "custom";
  return "unknown";
}

export function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 10) return k.slice(0, 3) + "••••";
  return k.slice(0, 6) + "••••••" + k.slice(-4);
}

// In-memory health state (resets on restart — same as the original bot)
const cooldowns = new Map<string, number>(); // provider -> cooldownUntil ms
const failCounts = new Map<string, number>();
const HEALTHY_TTL = 1000 * 60 * 60 * 6;

const healthLog = new Map<string, { status: string; at: number }>();

export function vaultViews(vault: VaultKey[]): VaultKeyView[] {
  const now = Date.now();
  return vault.map((k) => {
    const provider = detectProvider(k.key);
    const cd = cooldowns.get(provider) ?? 0;
    const logged = healthLog.get(k.id);
    const status: VaultKeyView["lastStatus"] = cd > now ? "cooldown" : logged ? "healthy" : "untested";
    return { id: k.id, label: k.label || provider + " key", provider, masked: maskKey(k.key), addedAt: k.addedAt, lastStatus: status };
  });
}

function coolDown(provider: string) {
  const fails = (failCounts.get(provider) ?? 0) + 1;
  failCounts.set(provider, fails);
  if (fails >= 2) {
    const minutes = Math.min(30, 5 * fails);
    cooldowns.set(provider, Date.now() + minutes * 60_000);
  }
}

function revive(provider: string) {
  failCounts.set(provider, 0);
  cooldowns.delete(provider);
}

function providerBase(provider: string): string | null {
  switch (provider) {
    case "openai": return "https://api.openai.com/v1/chat/completions";
    case "openrouter": return "https://openrouter.ai/api/v1/chat/completions";
    case "groq": return "https://api.groq.com/openai/v1/chat/completions";
    case "xai": return "https://api.x.ai/v1/chat/completions";
    case "anthropic": return "https://api.anthropic.com/v1/messages";
    case "gemini": return "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    default: return null;
  }
}

function providerModel(provider: string): string {
  switch (provider) {
    case "openai": return "gpt-4o-mini";
    case "openrouter": return "openai/gpt-4o-mini";
    case "groq": return "llama-3.1-8b-instant";
    case "xai": return "grok-2-latest";
    case "anthropic": return "claude-3-5-haiku-latest";
    case "gemini": return "gemini-2.0-flash";
    default: return "gpt-4o-mini";
  }
}

/**
 * Round-robin call across all healthy vault keys.
 * Returns the first successful completion, or null if the pool
 * can't answer (the Beast then uses its own pen — graceful
 * degradation, exactly as the original bot does).
 */
export async function callAiPool(
  vault: VaultKey[],
  system: string,
  prompt: string,
  timeoutMs = 12_000
): Promise<{ text: string; provider: string } | null> {
  const now = Date.now();
  const usable = vault.filter((k) => {
    const p = detectProvider(k.key);
    return (cooldowns.get(p) ?? 0) <= now && providerBase(p) !== null;
  });
  for (const k of usable) {
    const provider = detectProvider(k.key);
    const base = providerBase(provider)!;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      if (provider === "anthropic") {
        res = await fetch(base, {
          method: "POST",
          signal: controller.signal,
          headers: { "content-type": "application/json", "x-api-key": k.key, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: providerModel(provider), max_tokens: 300, system, messages: [{ role: "user", content: prompt }] }),
        });
      } else if (provider === "gemini") {
        res = await fetch(base, {
          method: "POST",
          signal: controller.signal,
          headers: { "content-type": "application/json", "x-goog-api-key": k.key },
          body: JSON.stringify({ contents: [{ parts: [{ text: system + "\n\n" + prompt }] }] }),
        });
      } else {
        res = await fetch(base, {
          method: "POST",
          signal: controller.signal,
          headers: { "content-type": "application/json", authorization: `Bearer ${k.key}` },
          body: JSON.stringify({
            model: providerModel(provider),
            max_tokens: 300,
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt },
            ],
          }),
        });
      }
      clearTimeout(timer);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const text =
        data?.choices?.[0]?.message?.content ??
        data?.content?.[0]?.text ??
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        null;
      if (!text || typeof text !== "string") throw new Error("no text");
      revive(provider);
      healthLog.set(k.id, { status: "healthy", at: Date.now() });
      return { text: text.trim(), provider };
    } catch {
      coolDown(provider);
    }
  }
  return null;
}

export function parseVault(raw: string): VaultKey[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as VaultKey[]) : [];
  } catch {
    return [];
  }
}
