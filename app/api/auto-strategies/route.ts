import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user-session";
import { prisma } from "@/lib/db/prisma";
import { ensureEngineBootstrapped } from "@/lib/autotrading/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await ensureEngineBootstrapped();
  const strategies = await prisma.autoStrategy.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ strategies });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const symbol = typeof body?.symbol === "string" ? body.symbol : null;
  const stakeAmount = Number(body?.stakeAmount);
  const maxDailyStakeUsd = Number(body?.maxDailyStakeUsd);
  const maxTradesPerDay = Number(body?.maxTradesPerDay);

  if (!symbol || !(stakeAmount > 0) || !(maxDailyStakeUsd > 0) || !(maxTradesPerDay > 0)) {
    return NextResponse.json({ error: "symbol, stakeAmount, maxDailyStakeUsd, maxTradesPerDay are all required and must be positive." }, { status: 400 });
  }
  if (maxDailyStakeUsd < stakeAmount) {
    return NextResponse.json({ error: "maxDailyStakeUsd must be at least stakeAmount." }, { status: 400 });
  }

  const strategy = await prisma.autoStrategy.create({
    data: { userId: user.id, symbol, stakeAmount, maxDailyStakeUsd, maxTradesPerDay, enabled: false },
  });
  await prisma.auditLog.create({
    data: { actorType: "user", actorId: user.id, action: "auto_strategy_created", detail: { strategyId: strategy.id, symbol } },
  });

  return NextResponse.json({ strategy });
}
