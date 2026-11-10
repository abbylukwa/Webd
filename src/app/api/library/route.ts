import { NextResponse } from "next/server";
import { LIBRARY } from "@/lib/beast/knowledge";

export async function GET() {
  return NextResponse.json({ library: LIBRARY });
}
