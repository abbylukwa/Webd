// CLI twin of the in-app Test Center. Runs the same feature-by-feature suite
// against a throwaway sandbox (never touches the live studio state).
//   bun scripts/test-beast.ts
import { runSelfTest } from '../src/lib/beast/selftest';

const report = await runSelfTest();

const groups = ['A · Generator', 'B · Design knowledge', 'C · Engine (sandboxed)'] as const;
let lastGroup = '';
for (const r of report.results) {
  if (r.group !== lastGroup) {
    console.log(`\n── ${r.group} ${'─'.repeat(Math.max(1, 58 - r.group.length))}`);
    lastGroup = r.group;
  }
  const mark = r.pass ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${r.id.padEnd(4)} ${r.feature}`);
  if (!r.pass) console.log(`         ↳ ${r.detail}`);
}
console.log('\n══════════════════════════════════════');
console.log(`${report.passCount}/${report.results.length} features pass · ${report.failCount} failed · ${report.durationMs}ms`);
if (report.failCount > 0) {
  process.exit(1);
}
console.log('ALL FEATURES VERIFIED ✅');
