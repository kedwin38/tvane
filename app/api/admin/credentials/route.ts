import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin-session";
import { listCredentialKeys, setCredential, getCredential } from "@/lib/credentials";
import { prisma } from "@/lib/db/prisma";
import { resetMarketSocket } from "@/lib/deriv/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_KEYS: Record<string, string> = {
  deriv_oauth_app_id: "Deriv app_id used for user Login-with-Deriv OAuth.",
  deriv_master_app_id: "Deriv app_id used for the shared market-data connection.",
  deriv_master_token: "API token for the shared market-data connection (optional; app_id alone works for most market data).",
  deriv_ws_url: "Deriv WebSocket endpoint override.",
};

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Ensure every known key at least shows up (bootstrapped from env)
  // even before an admin has ever touched it.
  await Promise.all(Object.keys(KNOWN_KEYS).map((k) => getCredential(k)));

  const stored = await listCredentialKeys();
  const byKey = new Map(stored.map((s) => [s.key, s]));
  const rows = Object.entries(KNOWN_KEYS).map(([key, description]) => {
    const s = byKey.get(key);
    return {
      key,
      description,
      configured: Boolean(s),
      masked: s?.masked ?? null,
      updatedAt: s?.updatedAt ?? null,
      updatedBy: s?.updatedBy ?? null,
    };
  });

  return NextResponse.json({ credentials: rows });
}

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : null;
  const value = typeof body?.value === "string" ? body.value : null;
  if (!key || !KNOWN_KEYS[key]) {
    return NextResponse.json({ error: "Unknown credential key." }, { status: 400 });
  }
  if (!value || value.trim().length === 0) {
    return NextResponse.json({ error: "Value cannot be empty." }, { status: 400 });
  }

  await setCredential(key, value.trim(), admin.id, KNOWN_KEYS[key]);
  await prisma.auditLog.create({
    data: { actorType: "admin", actorId: admin.id, action: "credential_updated", detail: { key } },
  });

  if (key === "deriv_master_app_id" || key === "deriv_master_token" || key === "deriv_ws_url") {
    resetMarketSocket();
  }

  return NextResponse.json({ ok: true });
}
