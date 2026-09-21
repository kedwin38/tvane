import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user-session";
import { getUserSocket } from "@/lib/deriv/user-connections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const socket = await getUserSocket(user.id);
    const info = socket.getAccountInfo();
    const balanceRes = await socket.request("balance", { balance: 1 });

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
    return NextResponse.json({ error: err?.message ?? "Failed to reach Deriv." }, { status: 502 });
  }
}
