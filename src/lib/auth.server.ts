import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { z } from "zod";
import { findOtherSignedInUser } from "./active-session.server";
import { prisma } from "./db.server";

function getSecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) throw new Error("BETTER_AUTH_SECRET env var is not set");
	if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
	return secret;
}

// Sign-in and sign-up both start a session, so both check who is signed in.
const SESSION_STARTING_PATHS = new Set(["/sign-in/email", "/sign-up/email"]);
const sessionStartBody = z.object({ email: z.string() });

/** The better-auth server instance. */
export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	// On Postgres this makes better-auth leave `id` to the `uuidv7()` column default.
	advanced: { database: { generateId: "uuid" } },
	secret: getSecret(),
	emailAndPassword: { enabled: true },
	session: {
		// A fixed day, so a person who forgets to sign out frees the app within 24 hours.
		expiresIn: 60 * 60 * 24,
		disableSessionRefresh: true,
		// A signed cookie caches the session, so most requests skip the database lookup.
		cookieCache: { enabled: true, maxAge: 5 * 60 },
	},
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
		// One person is signed in at a time. Everyone else waits for them to sign out or for
		// their session to end.
		before: createAuthMiddleware(async (ctx) => {
			if (!SESSION_STARTING_PATHS.has(ctx.path)) return;
			const body = sessionStartBody.safeParse(ctx.body);
			if (!body.success) return;
			const other = await findOtherSignedInUser({ email: body.data.email });
			if (other) {
				throw new APIError("FORBIDDEN", {
					message: `${other.name} is signed in. They need to sign out, or you can sign in after their session ends.`,
				});
			}
		}),
	},
	plugins: [tanstackStartCookies()],
});
