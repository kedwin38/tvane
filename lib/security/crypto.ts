import { randomBytes, createCipheriv, createDecipheriv, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

// AES-256-GCM at-rest encryption for secrets stored in Postgres (user
// Deriv tokens, platform credentials). The key never lives in the repo
// or the database — only in the ENCRYPTION_KEY environment variable
// (set directly on the Railway service). Losing/rotating this key
// invalidates every ciphertext it produced, so treat it like any other
// production secret: back it up out-of-band, never regenerate casually.

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes) — see .env.example."
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypts a UTF-8 string. Output format: base64(iv[12] || authTag[16] || ciphertext). */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// Password hashing (admin accounts only) via Node's built-in scrypt —
// deliberately avoids bcrypt/argon2 native addons, which have repeatedly
// caused container build failures in this project (see the `sharp`
// revert in an earlier commit). scrypt is a well-regarded KDF and ships
// in node:crypto with no native build step.
const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
