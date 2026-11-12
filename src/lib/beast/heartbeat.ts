// ══════════════════════════════════════════════════════════════════════
//  HEARTBEAT (v3) — the Beast works even when nobody is watching.
//  A server-side interval pokes the v3 engine every 60 seconds. The tick
//  is idempotent per real day: it replays missed work days on wake-up and
//  otherwise costs nothing. (Clients also trigger catch-up on load.)
// ══════════════════════════════════════════════════════════════════════

import { loadState, tick } from "./engine";

const g = globalThis as unknown as { __beastHeartbeat?: NodeJS.Timeout };

export function ensureHeartbeat() {
  if (g.__beastHeartbeat) return;
  g.__beastHeartbeat = setInterval(() => {
    tick(loadState()).catch(() => {
      /* the Beast never lets a dropped beat stop the studio */
    });
  }, 60_000);
  // Never keep the process alive just for the heartbeat
  g.__beastHeartbeat.unref?.();
}
