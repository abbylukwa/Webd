import { NextResponse } from "next/server";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/beast/scheduler";
import { crapAudit, buildDesignNotes, buildLicense, slugify, SiteDecisions } from "@/lib/beast/generator";
import { archetypeById } from "@/lib/beast/archetypes";

export const dynamic = "force-dynamic";

// Download EVERYTHING on the shelf as one zip, with a manifest.
export async function GET() {
  const jobs = await db.job.findMany({ where: { status: "shipped" }, orderBy: { shippedAt: "desc" } });
  if (jobs.length === 0) {
    return NextResponse.json({ error: "The shelf is empty — nothing to download yet." }, { status: 404 });
  }
  const s = await getSettings();
  const zip = new JSZip();
  const rows = ["name,archetype,shipped_at,files,copyright"];

  for (const job of jobs) {
    const decisions: SiteDecisions = JSON.parse(job.decisions);
    const year = job.shippedAt ? job.shippedAt.getFullYear() : new Date().getFullYear();
    const buildCtx = {
      name: job.name,
      archetypeId: job.archetype,
      seed: job.seed,
      decisions,
      copyrightHolder: s.copyrightHolder,
      copyrightNote: s.copyrightNote,
      year,
    };
    const slug = slugify(job.name);
    const folder = zip.folder(slug)!;
    folder.file("index.html", job.html ?? "");
    folder.file("DESIGN-NOTES.md", buildDesignNotes(buildCtx, crapAudit(decisions)));
    folder.file("LICENSE.txt", buildLicense(buildCtx));
    rows.push(`"${job.name}","${archetypeById(job.archetype).label}","${job.shippedAt?.toISOString() ?? ""}","${slug}/index.html","© ${year} ${s.copyrightHolder}"`);
  }
  zip.file("MANIFEST.csv", rows.join("\n"));

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="beast-shelf-${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
