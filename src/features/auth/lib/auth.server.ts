import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "#/lib/db.server";

export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	advanced: { database: { generateId: "uuid" } }, // Better Auth allows Postgres to generates the UUID
	secret: process.env.BETTER_AUTH_SECRET,
	emailAndPassword: { enabled: true },
	plugins: [tanstackStartCookies()],
});
