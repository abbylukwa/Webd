// ══════════════════════════════════════════════════════════════════════
//  HEARTBEAT — the Beast works even when nobody is watching.
//  A server-side interval ticks the studio every 30 seconds, so
//  commissions advance and new ones spawn while the app is closed.
//  (Clients also tick on load for instant freshness.)
// ══════════════════════════════════════════════════════════════════════

import { tick } from "./scheduler";

const g = globalThis as unknown as { __beastHeartbeat?: NodeJS.Timeout };

export function ensureHeartbeat() {
  if (g.__beastHeartbeat) return;
  g.__beastHeartbeat = setInterval(() => {
    tick().catch(() => {
      /* the Beast never lets a dropped beat stop the studio */
    });
  }, 30_000);
  // Never keep the process alive just for the heartbeat
  g.__beastHeartbeat.unref?.();
}
