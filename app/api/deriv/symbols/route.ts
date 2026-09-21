import { NextResponse } from "next/server";
import { derivClient } from "@/lib/deriv/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await derivClient.request("active_symbols", {
      active_symbols: "brief",
      product_type: "basic",
    });

    const symbols = (res.active_symbols ?? [])
      .filter((s: any) => s.exchange_is_open === 1 || s.market === "synthetic_index")
      .map((s: any) => ({
        symbol: s.symbol,
        display_name: s.display_name,
        market: s.market,
        market_display_name: s.market_display_name,
        submarket_display_name: s.submarket_display_name,
        pip: s.pip,
      }));

    return NextResponse.json({ symbols });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch symbols." },
      { status: 502 }
    );
  }
}
