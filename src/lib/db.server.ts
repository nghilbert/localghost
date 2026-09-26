import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "#/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

declare global {
	var __prisma: PrismaClient | undefined;
}

/** The shared Prisma client, reused across dev reloads. */
export const prisma = globalThis.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
