import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user-session";
import { prisma } from "@/lib/db/prisma";
import { registerStrategy, unregisterStrategy } from "@/lib/autotrading/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const strategy = await prisma.autoStrategy.findUnique({ where: { id: params.id } });
  if (!strategy || strategy.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) is required." }, { status: 400 });
  }

  const updated = await prisma.autoStrategy.update({
    where: { id: strategy.id },
    data: { enabled: body.enabled },
  });

  if (body.enabled) {
    await registerStrategy(updated);
  } else {
    unregisterStrategy(updated.id);
  }

  await prisma.auditLog.create({
    data: {
      actorType: "user",
      actorId: user.id,
      action: body.enabled ? "auto_strategy_enabled" : "auto_strategy_disabled",
      detail: { strategyId: updated.id },
    },
  });

  return NextResponse.json({ strategy: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const strategy = await prisma.autoStrategy.findUnique({ where: { id: params.id } });
  if (!strategy || strategy.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  unregisterStrategy(strategy.id);
  await prisma.autoStrategy.delete({ where: { id: strategy.id } });
  return NextResponse.json({ ok: true });
}
