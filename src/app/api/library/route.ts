import { NextResponse } from "next/server";
import { LIBRARY } from "@/lib/beast/knowledge";
import { LAYOUTS, specSummary } from "@/lib/beast/layouts";

export async function GET() {
  return NextResponse.json({
    library: LIBRARY,
    layouts: LAYOUTS.map((l) => ({
      id: l.id,
      name: l.name,
      source: l.source,
      readingPattern: l.readingPattern,
      arrangement: l.arrangement,
      heroMode: l.heroMode,
      sectionOrder: l.sectionOrder,
      featuresMode: l.featuresMode,
      storyMode: l.storyMode,
      voicesMode: l.voicesMode,
      navMode: l.navMode,
      spec: l.spec,
      bestFor: l.bestFor,
      crap: l.crap,
      mobile: l.mobile,
      specLine: specSummary(l),
    })),
  });
}
