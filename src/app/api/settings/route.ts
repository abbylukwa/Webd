import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/beast/scheduler";
import { parseVault, vaultViews, detectProvider, maskKey } from "@/lib/beast/aipool";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSettings();
  const vault = parseVault(s.apiKeyVault);
  return NextResponse.json({
    copyrightHolder: s.copyrightHolder,
    copyrightNote: s.copyrightNote,
    pace: s.pace,
    workbenches: s.workbenches,
    autoRespawn: s.autoRespawn,
    vault: vaultViews(vault),
  });
}

export async function POST(req: NextRequest) {
  const s = await getSettings();
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.copyrightHolder === "string" && body.copyrightHolder.trim())
    data.copyrightHolder = body.copyrightHolder.trim().slice(0, 120);
  if (typeof body.copyrightNote === "string") data.copyrightNote = body.copyrightNote.trim().slice(0, 200);
  if (typeof body.pace === "number" && body.pace > 0 && body.pace <= 600) data.pace = Math.round(body.pace);
  if (typeof body.workbenches === "number" && body.workbenches >= 1 && body.workbenches <= 6)
    data.workbenches = Math.round(body.workbenches);
  if (typeof body.autoRespawn === "boolean") data.autoRespawn = body.autoRespawn;

  // API key vault — keys are stored server-side ONLY, never returned raw
  if (typeof body.newApiKey === "string" && body.newApiKey.trim().length >= 8) {
    const vault = parseVault(s.apiKeyVault);
    if (vault.length >= 12) {
      return NextResponse.json({ error: "Vault is full (12 slots — BreadBot rule)." }, { status: 400 });
    }
    const provider = detectProvider(body.newApiKey.trim());
    vault.push({
      id: `k_${Date.now().toString(36)}`,
      label: body.newKeyLabel?.toString().trim().slice(0, 60) || `${provider} key`,
      key: body.newApiKey.trim(),
      addedAt: new Date().toISOString(),
    });
    data.apiKeyVault = JSON.stringify(vault);
  }

  if (typeof body.removeKeyId === "string") {
    const vault = parseVault(s.apiKeyVault).filter((k) => k.id !== body.removeKeyId);
    data.apiKeyVault = JSON.stringify(vault);
  }

  await db.setting.update({ where: { id: "singleton" }, data });

  const fresh = await getSettings();
  return NextResponse.json({
    copyrightHolder: fresh.copyrightHolder,
    copyrightNote: fresh.copyrightNote,
    pace: fresh.pace,
    workbenches: fresh.workbenches,
    autoRespawn: fresh.autoRespawn,
    vault: vaultViews(parseVault(fresh.apiKeyVault)),
    maskedPreview: maskKey(typeof body.newApiKey === "string" ? body.newApiKey : ""),
  });
}
