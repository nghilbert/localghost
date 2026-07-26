import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "./db.server";

function getSecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) throw new Error("BETTER_AUTH_SECRET env var is not set");
	if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
	return secret;
}

export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	advanced: { database: { generateId: "uuid" } }, // Better Auth allows Postgres to generates the UUID
	secret: getSecret(),
	emailAndPassword: { enabled: true },
	// A signed, short-lived cookie carries the session so most requests skip the
	// session + user table lookups entirely (root `beforeLoad` and every server
	// fn's auth check both resolve through this).
	session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
	rateLimit: {
		enabled: true,
		customRules: {
			"/sign-in/email": { window: 60, max: 5 },
			"/sign-up/email": { window: 60, max: 5 },
		},
	},
	user: {
		// Chat defaults live on the user row (better-auth's mechanism for per-user
		// fields). `input: false` keeps them out of signup/update payloads; the
		// settings server fns are the only write path.
		additionalFields: {
			systemPrompt: { type: "string", required: false, input: false },
			temperature: { type: "number", required: false, input: false },
		},
		deleteUser: { enabled: true },
	},
	hooks: {
		// Personal deployment: only the first account may sign up; later attempts
		// are rejected regardless of who is asking.
		before: createAuthMiddleware(async (ctx) => {
			if (ctx.path !== "/sign-up/email") return;
			const existingUserCount = await prisma.user.count();
			if (existingUserCount > 0) {
				throw new APIError("FORBIDDEN", {
					message: "Sign-up is disabled: an account already exists on this instance.",
				});
			}
		}),
	},
	plugins: [tanstackStartCookies()],
});
