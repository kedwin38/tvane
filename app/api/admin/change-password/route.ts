import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin-session";
import { hashPassword, verifyPassword } from "@/lib/security/crypto";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : null;
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : null;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both fields are required." }, { status: 400 });
  }
  if (newPassword.length < 12) {
    return NextResponse.json({ error: "New password must be at least 12 characters." }, { status: 400 });
  }

  const ok = await verifyPassword(currentPassword, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash, mustChangePassword: false },
  });
  await prisma.auditLog.create({
    data: { actorType: "admin", actorId: admin.id, action: "password_changed" },
  });

  return NextResponse.json({ ok: true });
}
