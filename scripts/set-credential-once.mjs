// Opt-in, idempotent credential push — runs at boot but does nothing
// unless ONE_OFF_CREDENTIAL_KEY / ONE_OFF_CREDENTIAL_VALUE are both set
// on the Railway service. Exists because the admin credentials UI
// (/admin/credentials) needs a live, working login to reach, which is
// exactly what's being debugged — this is the bootstrap path around
// that chicken-and-egg problem. Clear both env vars after use so a
// future deploy doesn't silently re-stamp the value over whatever an
// admin sets via the UI later.
//
// Encryption format here must stay byte-for-byte compatible with
// lib/security/crypto.ts's encryptSecret(): base64(iv[12] || authTag[16]
// || ciphertext), AES-256-GCM.

import { PrismaClient } from "@prisma/client";
import { randomBytes, createCipheriv } from "node:crypto";

const prisma = new PrismaClient();

function encryptSecret(plaintext, keyHex) {
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

async function main() {
  const key = process.env.ONE_OFF_CREDENTIAL_KEY;
  const value = process.env.ONE_OFF_CREDENTIAL_VALUE;
  const encKey = process.env.ENCRYPTION_KEY;

  if (!key || !value) {
    console.log("[set-credential-once] No ONE_OFF_CREDENTIAL_KEY/VALUE set — skipping.");
    return;
  }
  if (!encKey || encKey.length !== 64) {
    console.error("[set-credential-once] ENCRYPTION_KEY missing/invalid — cannot encrypt, skipping.");
    return;
  }

  await prisma.platformCredential.upsert({
    where: { key },
    create: { key, valueCipher: encryptSecret(value, encKey), description: "set via one-off boot script" },
    update: { valueCipher: encryptSecret(value, encKey), updatedBy: "one-off-script" },
  });
  console.log(`[set-credential-once] Updated credential "${key}".`);
}

main()
  .catch((err) => {
    console.error("[set-credential-once] Failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
