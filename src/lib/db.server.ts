import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "#/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

/** The shared Prisma client. */
export const prisma = new PrismaClient({ adapter });
