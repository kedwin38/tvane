import { NextResponse } from "next/server";
import { derivClient } from "@/lib/deriv/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await derivClient.connect();
    const info = derivClient.getAccountInfo();
    if (!info) {
      return NextResponse.json(
        { error: "Not authorized. Check DERIV_API_TOKEN in .env.local." },
        { status: 401 }
      );
    }

    const balanceRes = await derivClient.request("balance", { balance: 1 });

    return NextResponse.json({
      loginid: info.loginid,
      email: info.email,
      country: info.country,
      currency: info.currency,
      is_virtual: Boolean(info.is_virtual),
      landing_company_name: info.landing_company_name,
      scopes: info.scopes,
      balance: balanceRes.balance,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to reach Deriv." },
      { status: 502 }
    );
  }
}
