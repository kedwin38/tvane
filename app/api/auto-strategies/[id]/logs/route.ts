import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user-session";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const strategy = await prisma.autoStrategy.findUnique({ where: { id: params.id } });
  if (!strategy || strategy.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const logs = await prisma.autoTradeLog.findMany({
    where: { strategyId: strategy.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ logs });
}
