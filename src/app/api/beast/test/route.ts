import { NextResponse } from 'next/server';
import { runSelfTest } from '@/lib/beast/selftest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/beast/test — feature-by-feature verification.
 * The suite runs entirely against a throwaway sandbox (BEAST_DATA_DIR is
 * redirected inside the engine tests), so the live studio state is never touched.
 */
export async function GET() {
  try {
    const report = await runSelfTest();
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: 'test run crashed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
