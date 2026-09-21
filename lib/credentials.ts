import "server-only";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

// Runtime-editable platform credentials (Deriv OAuth app_id, the master
// API token used for public market data / admin health checks, etc).
// Postgres is the source of truth so an admin can rotate these from
// /admin without a redeploy; environment variables are only the initial
// bootstrap value the first time a key is read and nothing exists yet.
// A short in-memory cache avoids hitting the DB on every request —
// updateCredential() clears it immediately so changes take effect on
// the very next request, not after the TTL.

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: string; expiresAt: number }>();

const ENV_FALLBACKS: Record<string, string | undefined> = {
  deriv_oauth_app_id: process.env.DERIV_OAUTH_APP_ID,
  deriv_master_app_id: process.env.DERIV_APP_ID,
  deriv_master_token: process.env.DERIV_API_TOKEN,
  deriv_ws_url: process.env.DERIV_WS_URL,
};

export async function getCredential(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const row = await prisma.platformCredential.findUnique({ where: { key } });
  if (row) {
    const value = decryptSecret(row.valueCipher);
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  const fallback = ENV_FALLBACKS[key];
  if (fallback) {
    // Persist the bootstrap value so the admin panel has something to
    // display/edit immediately, rather than silently reading env forever.
    await prisma.platformCredential.create({
      data: { key, valueCipher: encryptSecret(fallback), description: "bootstrapped from env" },
    });
    cache.set(key, { value: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
    return fallback;
  }

  return null;
}

export async function setCredential(key: string, value: string, updatedBy: string, description?: string) {
  await prisma.platformCredential.upsert({
    where: { key },
    create: { key, valueCipher: encryptSecret(value), description, updatedBy },
    update: { valueCipher: encryptSecret(value), updatedBy, ...(description ? { description } : {}) },
  });
  cache.delete(key);
}

export async function listCredentialKeys(): Promise<
  { key: string; description: string | null; updatedAt: Date; updatedBy: string | null; masked: string }[]
> {
  const rows = await prisma.platformCredential.findMany({ orderBy: { key: "asc" } });
  return rows.map((r) => {
    const value = decryptSecret(r.valueCipher);
    const masked = value.length <= 8 ? "••••••••" : `${value.slice(0, 4)}••••${value.slice(-4)}`;
    return { key: r.key, description: r.description, updatedAt: r.updatedAt, updatedBy: r.updatedBy, masked };
  });
}
