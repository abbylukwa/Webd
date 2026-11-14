// probe_findings.ts — ground truth: does the solver actually write findings
// into site.art when review.scan / review.demand run? (No GitHub, no AI —
// pure deterministic path in a throwaway sandbox.)
import fs from 'fs';
import { topUp, drainExclusive, loadState } from '../src/lib/beast/engine';

process.env.BEAST_DATA_DIR = '/tmp/probe-findings-sandbox';
fs.rmSync('/tmp/probe-findings-sandbox', { recursive: true, force: true });

const state = loadState();
topUp(state);

// drain until every site has review.scan + review.demand accepted (or give up)
for (let round = 0; round < 60; round++) {
  const needMore = state.sites.some((s) => {
    const art = s.art ?? {};
    return !(art.findings?.length) || !(art.demands?.length);
  });
  if (!needMore) break;
  await drainExclusive(state, { maxTasks: 30, maxMs: 25000 });
}

for (const s of state.sites) {
  const art = s.art ?? {};
  console.log(`${s.brand}: findings=${art.findings?.length ?? 'MISSING'} demands=${art.demands?.length ?? 'MISSING'} artKeys=${Object.keys(art).length}`);
  console.log(`  scan note: ${(art.findings?.length ? 'OK' : 'NO FINDINGS')}`);
  if (art.findings?.length) {
    const f = art.findings[0];
    console.log(`  finding[0]: hate="${f.hate?.slice(0, 60)}" source="${f.source?.slice(0, 50)}"`);
  }
}
console.log('executed rounds done; sites:', state.sites.length);
