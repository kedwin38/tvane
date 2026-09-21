import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ email: admin.email, mustChangePassword: admin.mustChangePassword });
}
