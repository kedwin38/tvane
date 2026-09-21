import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/db/prisma";
import { getMarketSocket } from "@/lib/deriv/market";
import { getActiveUserConnectionCount } from "@/lib/deriv/user-connections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkDb(): Promise<{ ok: boolean; latencyMs: number | null; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: null, error: err?.message };
  }
}

async function checkDerivMarket(): Promise<{ ok: boolean; latencyMs: number | null; error?: string }> {
  const start = Date.now();
  try {
    const socket = await getMarketSocket();
    await socket.request("ping", { ping: 1 });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: null, error: err?.message };
  }
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [db, derivMarket, userCount, snapshotCount, lastSnapshot, activeStrategyCount, trades24h] =
    await Promise.all([
      checkDb(),
      checkDerivMarket(),
      prisma.user.count(),
      prisma.intelligenceSnapshot.count(),
      prisma.intelligenceSnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.autoStrategy.count({ where: { enabled: true } }),
      prisma.autoTradeLog.groupBy({
        by: ["outcome"],
        where: { createdAt: { gte: since24h } },
        _count: { _all: true },
      }),
    ]);

  return NextResponse.json({
    db,
    derivMarket,
    activeUserConnections: getActiveUserConnectionCount(),
    userCount,
    intelligence: {
      snapshotCount,
      lastSnapshotAt: lastSnapshot?.createdAt ?? null,
      lastSymbol: lastSnapshot?.symbol ?? null,
      lastModelValid: lastSnapshot?.modelValid ?? null,
    },
    autoTrading: {
      activeStrategyCount,
      last24h: Object.fromEntries(trades24h.map((t) => [t.outcome, t._count._all])),
    },
    deployment: {
      environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? "unknown",
      serviceName: process.env.RAILWAY_SERVICE_NAME ?? "unknown",
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
