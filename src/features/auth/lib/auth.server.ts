import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "#/lib/db.server";

export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	advanced: { database: { generateId: "uuid" } }, // Better Auth allows Postgres to generates the UUID
	secret: process.env.BETTER_AUTH_SECRET,
	emailAndPassword: { enabled: true },
	user: {
		// Chat defaults live on the user row (better-auth's mechanism for per-user
		// fields). `input: false` keeps them out of signup/update payloads; the
		// settings server fns are the only write path.
		additionalFields: {
			systemPrompt: { type: "string", required: false, input: false },
			temperature: { type: "number", required: false, input: false },
		},
	},
	plugins: [tanstackStartCookies()],
});
