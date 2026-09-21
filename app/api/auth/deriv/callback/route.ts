import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { encryptSecret } from "@/lib/security/crypto";
import { createUserSession } from "@/lib/auth/user-session";
import { getCredential } from "@/lib/credentials";
import { DerivSocket } from "@/lib/deriv/socket";
import { registerUserSocket } from "@/lib/deriv/user-connections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deriv's third-party OAuth flow does not exchange a code server-side —
// it redirects back to this callback with one query param triple per
// account linked to the user's Deriv login (acct1/token1/cur1,
// acct2/token2/cur2, ...), covering both real and demo (VRTC-prefixed)
// accounts. Confirmed directly against Deriv's own source — the parser
// and its test fixture in deriv-com/deriv-api-docs
// (src/utils/index.ts::getAccountsFromSearchParams), and a real
// production oauth.deriv.com redirect URL with the same shape found via
// search. These tokens don't expire on a documented TTL (no expiry
// field in the `authorize` schema) — they're long-lived until revoked,
// unlike the newer PKCE/OIDC flow's short-lived access tokens. That
// newer flow (auth.deriv.com/oauth2/auth, RFC 7636 PKCE) exists and is
// what Deriv's own newest reference apps use, but its client_id is a
// separate, non-self-service credential Deriv issues on request — not
// what a self-service developers.deriv.com app_id maps to. So this
// build targets the classic flow, which remains fully self-service and
// is still what the newer flow bridges to under the hood.
//
// One open item from that same research pass, unresolved and worth
// flagging rather than silently assuming: every known real Deriv app_id
// is a short numeric string (1089, 16929, 36300, ...), while this
// deployment's registered app_id (34sCzt4bjcWFOyRS68yfC) is a 22-char
// mixed-case string that matches no confirmed example. It may simply be
// a newer format the research couldn't corroborate — but if login fails
// outright, that mismatch is the first thing to check in the Deriv
// Application Manager dashboard.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const expectedState = cookies().get("tv_oauth_state")?.value;
  cookies().delete("tv_oauth_state");

  const state = url.searchParams.get("state");
  if (!expectedState || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=state_mismatch", url.origin));
  }

  const accounts: { loginid: string; token: string; currency: string }[] = [];
  for (let i = 1; ; i++) {
    const acct = url.searchParams.get(`acct${i}`);
    const token = url.searchParams.get(`token${i}`);
    const cur = url.searchParams.get(`cur${i}`);
    if (!acct || !token) break;
    accounts.push({ loginid: acct, token, currency: cur ?? "" });
  }

  if (accounts.length === 0) {
    return NextResponse.redirect(new URL("/login?error=no_accounts", url.origin));
  }

  // Prefer a real (non-virtual) account as the primary session if one
  // was returned; Deriv virtual/demo login ids conventionally start
  // with "VRT". The true is_virtual flag comes from `authorize` below
  // regardless — this only decides which token we authorize with first.
  const primary = accounts.find((a) => !a.loginid.startsWith("VRT")) ?? accounts[0];

  const appId = (await getCredential("deriv_oauth_app_id")) ?? (await getCredential("deriv_master_app_id"));
  if (!appId) {
    return NextResponse.redirect(new URL("/login?error=not_configured", url.origin));
  }

  let socket: DerivSocket;
  try {
    socket = new DerivSocket(appId, primary.token);
    await socket.connect();
  } catch {
    return NextResponse.redirect(new URL("/login?error=deriv_unreachable", url.origin));
  }

  const info = socket.getAccountInfo();
  if (!info) {
    socket.close();
    return NextResponse.redirect(new URL("/login?error=authorize_failed", url.origin));
  }

  const linkedAccounts = accounts.map((a) => ({
    loginid: a.loginid,
    currency: a.currency,
    tokenCipher: encryptSecret(a.token),
  }));

  const user = await prisma.user.upsert({
    where: { derivLoginId: info.loginid },
    create: {
      derivLoginId: info.loginid,
      email: info.email,
      country: info.country,
      currency: info.currency,
      isVirtual: Boolean(info.is_virtual),
      landingCompanyName: info.landing_company_name,
      derivTokenCipher: encryptSecret(primary.token),
      linkedAccounts,
      lastLoginAt: new Date(),
    },
    update: {
      email: info.email,
      country: info.country,
      currency: info.currency,
      isVirtual: Boolean(info.is_virtual),
      landingCompanyName: info.landing_company_name,
      derivTokenCipher: encryptSecret(primary.token),
      linkedAccounts,
      lastLoginAt: new Date(),
    },
  });

  registerUserSocket(user.id, socket);
  await createUserSession(user.id);
  await prisma.auditLog.create({
    data: { actorType: "user", actorId: user.id, action: "login", detail: { loginid: info.loginid } },
  });

  return NextResponse.redirect(new URL("/terminal", url.origin));
}
