import "server-only";
import { DerivSocket } from "./socket";
import { getCredential } from "@/lib/credentials";

// Unauthenticated (or master-token) connection for public market data —
// active_symbols, ticks_history/candles, contracts_for. These Deriv calls
// don't require a user's own token, so one shared connection is correct
// here (unlike trading/account calls, which go through
// lib/deriv/user-connections.ts on each user's own authorized socket).

const globalForMarket = globalThis as unknown as { __derivMarket?: DerivSocket };

export async function getMarketSocket(): Promise<DerivSocket> {
  if (globalForMarket.__derivMarket) return globalForMarket.__derivMarket;

  const appId = (await getCredential("deriv_master_app_id")) ?? "1089";
  const wsUrl = (await getCredential("deriv_ws_url")) ?? undefined;
  const socket = new DerivSocket(appId, undefined, undefined, wsUrl);
  await socket.connect();
  globalForMarket.__derivMarket = socket;
  return socket;
}

/** Forces the shared market socket to reconnect with current credentials
 * (called from /admin after the master app_id/token is changed, so the
 * update takes effect without a redeploy). */
export function resetMarketSocket() {
  globalForMarket.__derivMarket?.close();
  globalForMarket.__derivMarket = undefined;
}
