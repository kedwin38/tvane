import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma = globalForPrisma.__prisma ?? new PrismaClient();
globalForPrisma.__prisma = prisma;
