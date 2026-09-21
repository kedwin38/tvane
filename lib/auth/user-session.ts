import "server-only";
import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { newSessionId, signSessionId, verifySessionCookie } from "@/lib/security/session-token";

const COOKIE_NAME = "tv_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set.");
  return s;
}

function hashIp(ip: string | null): string | undefined {
  if (!ip) return undefined;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function createUserSession(userId: string) {
  const id = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const h = headers();
  await prisma.userSession.create({
    data: {
      id,
      userId,
      expiresAt,
      userAgent: h.get("user-agent") ?? undefined,
      ipHash: hashIp(h.get("x-forwarded-for")),
    },
  });
  cookies().set(COOKIE_NAME, signSessionId(id, secret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const sessionId = verifySessionCookie(raw, secret());
  if (!sessionId) return null;

  const session = await prisma.userSession.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroyUserSession() {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (raw) {
    const sessionId = verifySessionCookie(raw, secret());
    if (sessionId) {
      await prisma.userSession.delete({ where: { id: sessionId } }).catch(() => {});
    }
  }
  cookies().delete(COOKIE_NAME);
}
