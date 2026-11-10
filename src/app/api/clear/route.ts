import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Clear the shelf: delete shipped jobs (they live in your downloaded zips now).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const onlyDownloaded = body.onlyDownloaded === true;
  const where = onlyDownloaded ? { status: "shipped", downloadedAt: { not: null } } : { status: "shipped" };
  const res = await db.job.deleteMany({ where });
  return NextResponse.json({ cleared: res.count });
}
