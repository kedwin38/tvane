import "server-only";
import { DerivSocket } from "./socket";
import { getCredential } from "@/lib/credentials";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret } from "@/lib/security/crypto";

// Per-user connection pool: each logged-in trader gets their own
// authorized Deriv WebSocket, keyed by our internal user id. Idle
// connections are evicted so a multi-tenant deployment doesn't hold
// thousands of open sockets against users who left hours ago.

const IDLE_EVICT_MS = 10 * 60 * 1000; // 10 minutes
const SWEEP_INTERVAL_MS = 60 * 1000;

const globalForPool = globalThis as unknown as { __derivUserPool?: Map<string, DerivSocket> };
const pool = globalForPool.__derivUserPool ?? new Map<string, DerivSocket>();
globalForPool.__derivUserPool = pool;

let sweepStarted = false;
function ensureSweep() {
  if (sweepStarted) return;
  sweepStarted = true;
  setInterval(() => {
    for (const [userId, socket] of pool.entries()) {
      if (socket.idleMs > IDLE_EVICT_MS) {
        socket.close();
        pool.delete(userId);
      }
    }
  }, SWEEP_INTERVAL_MS).unref();
}

export async function getUserSocket(userId: string): Promise<DerivSocket> {
  ensureSweep();
  const existing = pool.get(userId);
  if (existing) return existing;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const token = decryptSecret(user.derivTokenCipher);
  const appId = (await getCredential("deriv_oauth_app_id")) ?? (await getCredential("deriv_master_app_id")) ?? "1089";
  const wsUrl = (await getCredential("deriv_ws_url")) ?? undefined;

  const socket = new DerivSocket(appId, token, undefined, wsUrl);
  await socket.connect();
  pool.set(userId, socket);
  return socket;
}

/** Adopt an already-connected, already-authorized socket into the pool
 * (used right after OAuth login, so we don't open a second connection
 * moments after the one that just verified the user's token). */
export function registerUserSocket(userId: string, socket: DerivSocket) {
  ensureSweep();
  const existing = pool.get(userId);
  if (existing && existing !== socket) existing.close();
  pool.set(userId, socket);
}

/** Returns a user's pooled socket only if one already exists — never
 * opens a new connection. Used where opening a fresh connection just to
 * immediately tear it down again (e.g. logout) would be pointless. */
export function peekUserSocket(userId: string): DerivSocket | undefined {
  return pool.get(userId);
}

export function evictUserSocket(userId: string) {
  const socket = pool.get(userId);
  if (socket) {
    socket.close();
    pool.delete(userId);
  }
}

export function getActiveUserConnectionCount(): number {
  return pool.size;
}
