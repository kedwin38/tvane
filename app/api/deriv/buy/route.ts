import { NextResponse } from "next/server";
import { derivClient } from "@/lib/deriv/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Executes a real trade against the account tied to DERIV_API_TOKEN.
// This is a genuine financial action, not a simulation. It requires an
// explicit `confirm: true` from the caller — the terminal UI must not
// send that without the user typing an explicit confirmation, and must
// show the account's is_virtual status prominently before it does.
export async function POST(req: Request) {
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
    const res = await derivClient.request("buy", {
      buy: body.proposal_id,
      price: body.price,
    });
    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 422 });
    }
    return NextResponse.json({ buy: res.buy });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Buy request failed." },
      { status: 502 }
    );
  }
}
