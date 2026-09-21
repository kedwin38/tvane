import { NextResponse } from "next/server";
import { getCurrentAdmin, destroyAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (admin) {
    await prisma.auditLog.create({ data: { actorType: "admin", actorId: admin.id, action: "logout" } });
  }
  await destroyAdminSession();
  return NextResponse.redirect(new URL("/admin/login", req.url));
}
