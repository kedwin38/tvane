// Bootstraps the first admin account from ADMIN_SEED_EMAIL /
// ADMIN_SEED_PASSWORD (set on the Railway service, never in the repo).
// Idempotent — does nothing once any admin user exists. Runs as a step
// in `npm start`, ahead of `next start`, so a fresh deployment always
// has exactly one way in rather than needing a manual DB write.
//
// Plain ESM/CommonJS-free Node script (no TypeScript compile step) so it
// can run directly in the production container. The password hashing
// here must stay byte-for-byte compatible with lib/security/crypto.ts's
// hashPassword()/verifyPassword() format: "<saltHex>:<hashHex>" via
// scrypt, keylen 64.

import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function main() {
  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    console.log("[seed-admin] Admin user(s) already exist — skipping.");
    return;
  }

  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    console.warn(
      "[seed-admin] No admin exists and ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD are not set — " +
        "/admin will be unreachable until one is created manually."
    );
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.adminUser.create({
    data: { email: email.trim().toLowerCase(), passwordHash, mustChangePassword: true },
  });
  console.log(`[seed-admin] Created initial admin account for ${email}.`);
}

main()
  .catch((err) => {
    console.error("[seed-admin] Failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
