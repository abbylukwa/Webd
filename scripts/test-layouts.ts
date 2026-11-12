// Verifies the Layout Book end-to-end: every archetype × seeds →
// decisions → buildHtml. Checks layout distribution and that each
// layout's signature CSS/HTML lands in the emitted site.
import { ARCHETYPES } from "../src/lib/beast/archetypes";
import { decisionsFor, buildHtml } from "../src/lib/beast/generator";
import { layoutById } from "../src/lib/beast/layouts";

const usage = new Map<string, number>();
let errors = 0;

for (const arch of ARCHETYPES) {
  for (let s = 0; s < 40; s++) {
    const seed = 1000 + s * 7919 + arch.id.length * 13;
    const d = decisionsFor(seed, arch.id);
    usage.set(d.layoutId, (usage.get(d.layoutId) ?? 0) + 1);
    const html = buildHtml({
      name: "Test & Co",
      archetypeId: arch.id,
      seed,
      decisions: d,
      copyrightHolder: "Abby Lukwa",
      copyrightNote: "All rights reserved.",
      year: 2026,
    });
    const L = layoutById(d.layoutId);
    // signature checks per layout mode
    const must: string[] = [`--container:${L.spec.container}px`, `--gutter:${L.spec.gutter}px`];
    if (L.heroMode === "bento") must.push("grid-template-areas", "bento-cell", "area-head");
    if (L.heroMode === "ledger") must.push("ledger-rail", "hero-ledger");
    if (L.heroMode === "mono") must.push("hero-mono");
    if (L.heroMode === "z") must.push("hero-z-cta");
    if (L.navMode === "side") must.push("atlas-shell", "sidebar");
    if (L.featuresMode === "catalog") must.push("cards-catalog", "catalog-filter", "price");
    if (L.featuresMode === "list") must.push('class="rows"', "row-index");
    if (L.storyMode === "cases") must.push("case-row", "case-index");
    if (L.storyMode === "magazine") must.push("story-mag", "dropcap", "pull");
    if (L.voicesMode === "wall") must.push("quotes-wall");
    if (L.voicesMode === "stack") must.push("quotes-stack");
    for (const m of must) {
      if (!html.includes(m)) {
        errors++;
        console.error(`MISS ${arch.id} seed=${seed} layout=${L.id}: expected "${m}" in HTML`);
      }
    }
    // every site must carry the copyright line
    if (!html.includes(`© 2026 Abby Lukwa`)) {
      errors++;
      console.error(`MISS ${arch.id} seed=${seed}: copyright line absent`);
    }
    // no stray template junk
    if (html.includes("undefined") || html.includes("[object Object]")) {
      errors++;
      console.error(`MISS ${arch.id} seed=${seed}: undefined/[object] leaked into HTML`);
    }
  }
}

console.log("layout distribution:", Object.fromEntries([...usage.entries()].sort()));
const missing = ["aurora","splitline","bentoblox","ledger","zenith","gallerywall","atlas","folio","monolith","hive","studio","market"].filter(id => !usage.has(id));
if (missing.length) { errors++; console.error("LAYOUTS NEVER USED:", missing.join(", ")); }
console.log(errors === 0 ? "ALL LAYOUT CHECKS PASS ✅" : `${errors} errors ❌`);
