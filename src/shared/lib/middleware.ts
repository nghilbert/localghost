import { createMiddleware } from "@tanstack/react-start";
import { auth } from "#/shared/lib/auth.server";
import { getCurrentUserId } from "#/shared/lib/session.server";

/**
 * Resolves the current user once and hands `userId` to the handler's context,
 * logging anything the handler throws before it leaves the server.
 */
export const authedFn = createMiddleware({ type: "function" }).server(async ({ next }) => {
	const userId = await getCurrentUserId();
	try {
		return await next({ context: { userId } });
	} catch (error) {
		// Start serializes only `error.message` to the client, which rebuilds the Error
		// inside its deserializer. An unlogged failure therefore reaches the browser
		// with a stack pointing there instead of at the throw site.
		console.error(error);
		throw error;
	}
});

/**
 * Request-level counterpart for raw API routes (`server.handlers`), not
 * `createServerFn`. Short-circuits with a 401 Response instead of throwing,
 * matching the raw routes' previous inline session checks.
 */
export const authedRequest = createMiddleware({ type: "request" }).server(
	async ({ request, next }) => {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session) return new Response("Unauthorized", { status: 401 });
		return next({ context: { userId: session.user.id, userEmail: session.user.email } });
	},
);
