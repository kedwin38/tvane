import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/security/crypto";
import { createAdminSession } from "@/lib/auth/admin-session";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limited = rateLimit(`admin_login:${ip}`, 8, 5 * 60 * 1000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
  const password = typeof body?.password === "string" ? body.password : null;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  // Always run verifyPassword, even with a placeholder hash, so a
  // nonexistent-email response takes the same time as a wrong-password one.
  const ok = admin
    ? await verifyPassword(password, admin.passwordHash)
    : await verifyPassword(password, "0".repeat(32) + ":" + "0".repeat(128));

  if (!admin || !ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  await createAdminSession(admin.id);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await prisma.auditLog.create({
    data: { actorType: "admin", actorId: admin.id, action: "login" },
  });

  return NextResponse.json({ ok: true, mustChangePassword: admin.mustChangePassword });
}
