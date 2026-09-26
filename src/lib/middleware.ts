import { createMiddleware } from "@tanstack/react-start";
import { auth } from "#/lib/auth.server";
import { getCurrentUserId } from "#/lib/session.server";

/** Server function middleware: puts the signed-in `userId` in context and logs thrown errors. */
export const authedFn = createMiddleware({ type: "function" }).server(async ({ next }) => {
	const userId = await getCurrentUserId();
	try {
		return await next({ context: { userId } });
	} catch (error) {
		// Start sends only `error.message` to the client, so log the stack here.
		console.error(error);
		throw error;
	}
});

/** API route middleware: puts the signed-in user in context, or responds 401. */
export const authedRequest = createMiddleware({ type: "request" }).server(
	async ({ request, next }) => {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session) return new Response("Unauthorized", { status: 401 });
		return next({ context: { userId: session.user.id, userEmail: session.user.email } });
	},
);
