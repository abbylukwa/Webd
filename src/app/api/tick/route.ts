import { NextResponse } from "next/server";
import { tick, getStudioState } from "@/lib/beast/scheduler";

export const dynamic = "force-dynamic";

export async function POST() {
  await tick();
  const state = await getStudioState();
  return NextResponse.json(state);
}

export async function GET() {
  await tick();
  const state = await getStudioState();
  return NextResponse.json(state);
}
