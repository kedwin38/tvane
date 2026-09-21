import "server-only";
import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { newSessionId, signSessionId, verifySessionCookie } from "@/lib/security/session-token";

const COOKIE_NAME = "tv_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours — short-lived by design

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set.");
  return s;
}

function hashIp(ip: string | null): string | undefined {
  if (!ip) return undefined;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function createAdminSession(adminId: string) {
  const id = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const h = headers();
  await prisma.adminSession.create({
    data: {
      id,
      adminId,
      expiresAt,
      userAgent: h.get("user-agent") ?? undefined,
      ipHash: hashIp(h.get("x-forwarded-for")),
    },
  });
  cookies().set(COOKIE_NAME, signSessionId(id, secret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentAdmin() {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const sessionId = verifySessionCookie(raw, secret());
  if (!sessionId) return null;

  const session = await prisma.adminSession.findUnique({
    where: { id: sessionId },
    include: { admin: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.admin;
}

export async function destroyAdminSession() {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (raw) {
    const sessionId = verifySessionCookie(raw, secret());
    if (sessionId) {
      await prisma.adminSession.delete({ where: { id: sessionId } }).catch(() => {});
    }
  }
  cookies().delete(COOKIE_NAME);
}
