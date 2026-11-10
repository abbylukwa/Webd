import { NextResponse } from "next/server";
import { getStudioState } from "@/lib/beast/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getStudioState();
  return NextResponse.json(state);
}
