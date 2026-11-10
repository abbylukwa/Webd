import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Raw HTML of a shipped site — used by the in-app preview iframe.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await db.job.findUnique({ where: { id }, select: { html: true, status: true } });
  if (!job || !job.html) {
    return NextResponse.json({ error: "Not built yet." }, { status: 404 });
  }
  return new NextResponse(job.html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
