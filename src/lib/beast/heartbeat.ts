// ══════════════════════════════════════════════════════════════════════
//  WORK LOOP (v4) — the Beast works even when nobody is watching.
//  Every 20 seconds: if the ledger has queued tasks, drain a real slice of
//  them (bounded so a slice can never run away). When the floor is empty the
//  studio commissions fresh sites and keeps going. No simulated days — only
//  actual task executions, each one logged with a real timestamp.
// ══════════════════════════════════════════════════════════════════════

import { loadState, bootStudio, topUp, drainExclusive } from "./engine";

const g = globalThis as unknown as { __beastWorkLoop?: NodeJS.Timeout };

async function workSlice(): Promise<void> {
  const state = loadState();
  bootStudio(state);            // cold empty floor → commission immediately
  const queued = state.sites.reduce((n, s) => n + s.tasks.filter((t) => t.status === 'queued').length, 0);
  if (queued === 0) {
    // everything pending is done — fill the free slots so work never stalls
    topUp(state);
    return;
  }
  await drainExclusive(state, { maxTasks: 6, maxMs: 45_000 });
}

export function ensureWorkLoop() {
  if (g.__beastWorkLoop) return;
  const beat = () => workSlice().catch(() => { /* a dropped beat never stops the studio */ });
  beat();
  g.__beastWorkLoop = setInterval(beat, 20_000);
  // Never keep the process alive just for the work loop
  g.__beastWorkLoop.unref?.();
}
