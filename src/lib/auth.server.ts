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

/**
 * Whether sign-up is still open: no user has a password yet. A user row without a
 * credential cannot sign in, so it does not count.
 */
export async function isSignUpOpen(): Promise<boolean> {
	const usable = await prisma.user.count({
		where: { accounts: { some: { password: { not: null } } } },
	});
	return usable === 0;
}

/** The better-auth server instance. */
export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	// On Postgres this makes better-auth leave `id` to the `uuidv7()` column default.
	advanced: { database: { generateId: "uuid" } },
	secret: getSecret(),
	emailAndPassword: { enabled: true },
	// A signed cookie caches the session, so most requests skip the database lookup.
	session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
	rateLimit: {
		enabled: true,
		customRules: {
			"/sign-in/email": { window: 60, max: 5 },
			"/sign-up/email": { window: 60, max: 5 },
		},
	},
	user: {
		// Chat defaults on the user row. `input: false` keeps them out of sign-up and
		// update requests; only the settings server functions write them.
		additionalFields: {
			systemPrompt: { type: "string", required: false, input: false },
			temperature: { type: "number", required: false, input: false },
		},
		deleteUser: { enabled: true },
	},
	hooks: {
		// Only the first account may sign up. The sign-up page redirects on the same rule,
		// but this check is the one that enforces it.
		before: createAuthMiddleware(async (ctx) => {
			if (ctx.path !== "/sign-up/email") return;
			if (!(await isSignUpOpen())) {
				throw new APIError("FORBIDDEN", {
					message: "Sign-up is closed: this app is already set up for one account.",
				});
			}
		}),
	},
	plugins: [tanstackStartCookies()],
});
