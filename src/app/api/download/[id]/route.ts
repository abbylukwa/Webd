import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/beast/scheduler";
import { crapAudit, buildDesignNotes, buildLicense, slugify, SiteDecisions } from "@/lib/beast/generator";
import { archetypeById } from "@/lib/beast/archetypes";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await db.job.findUnique({ where: { id } });
  if (!job || job.status !== "shipped" || !job.html) {
    return NextResponse.json({ error: "Site not found or not shipped yet." }, { status: 404 });
  }
  const s = await getSettings();
  const decisions: SiteDecisions = JSON.parse(job.decisions);
  const buildCtx = {
    name: job.name,
    archetypeId: job.archetype,
    seed: job.seed,
    decisions,
    copyrightHolder: s.copyrightHolder,
    copyrightNote: s.copyrightNote,
    year: job.shippedAt ? job.shippedAt.getFullYear() : new Date().getFullYear(),
  };
  const audit = crapAudit(decisions);
  const slug = slugify(job.name);

  const zip = new JSZip();
  const folder = zip.folder(slug)!;
  folder.file("index.html", job.html);
  folder.file("DESIGN-NOTES.md", buildDesignNotes(buildCtx, audit));
  folder.file("LICENSE.txt", buildLicense(buildCtx));

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  await db.job.update({ where: { id }, data: { downloadedAt: new Date() } });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
