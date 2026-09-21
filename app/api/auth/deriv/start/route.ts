import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getCredential } from "@/lib/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Starts "Login with Deriv". Endpoint, param shape, and the multi-token
// callback (see callback/route.ts) are verified against Deriv's own
// source (deriv-api-docs, dtrader-template, trading-bot-template) —
// see the callback route's comment for what's confirmed vs. still open.
export async function GET() {
  const appId = (await getCredential("deriv_oauth_app_id")) ?? (await getCredential("deriv_master_app_id"));
  if (!appId) {
    return NextResponse.json({ error: "No Deriv OAuth app_id configured." }, { status: 500 });
  }

  const state = randomBytes(16).toString("hex");
  cookies().set("tv_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const url = new URL("https://oauth.deriv.com/oauth2/authorize");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("l", "en");
  url.searchParams.set("brand", "deriv");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
