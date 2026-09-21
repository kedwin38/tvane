import { NextResponse } from "next/server";
import { getCurrentUser, destroyUserSession } from "@/lib/auth/user-session";
import { peekUserSocket, evictUserSocket } from "@/lib/deriv/user-connections";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (user) {
    // Tell Deriv itself the session is over (schema: {"logout": 1}) before
    // tearing down our own socket — this is the actual sign-out signal on
    // their side, not just us dropping the connection.
    const socket = peekUserSocket(user.id);
    if (socket) {
      await socket.request("logout", { logout: 1 }).catch(() => {});
    }
    evictUserSocket(user.id);
    await prisma.auditLog.create({
      data: { actorType: "user", actorId: user.id, action: "logout" },
    });
  }
  await destroyUserSession();
  return NextResponse.redirect(new URL("/", req.url));
}
