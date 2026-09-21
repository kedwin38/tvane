import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user-session";
import { getUserSocket } from "@/lib/deriv/user-connections";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Executes a real trade against the signed-in user's own Deriv account.
// Requires an explicit confirm: true — the order ticket UI must not send
// that without the user typing an explicit confirmation.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || body.confirm !== true) {
    return NextResponse.json(
      { error: "Refused: this places a real order and requires confirm: true." },
      { status: 400 }
    );
  }
  if (!body.proposal_id || typeof body.price !== "number") {
    return NextResponse.json({ error: "Missing proposal_id or price." }, { status: 400 });
  }

  try {
    const socket = await getUserSocket(user.id);
    const res = await socket.request("buy", {
      buy: body.proposal_id,
      price: body.price,
    });

    await prisma.auditLog.create({
      data: {
        actorType: "user",
        actorId: user.id,
        action: res.error ? "trade_rejected" : "trade_executed",
        detail: res.error ? { error: res.error.message } : { buy: res.buy },
      },
    });

    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 422 });
    }
    return NextResponse.json({ buy: res.buy });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Buy request failed." }, { status: 502 });
  }
}
