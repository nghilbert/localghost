import { createMiddleware } from "@tanstack/react-start";
import { auth } from "#/lib/auth.server";
import { getCurrentUserId } from "#/lib/session.server";

/** Server function middleware: puts the signed-in `userId` in context. */
export const authedFn = createMiddleware({ type: "function" }).server(async ({ next }) => {
	const userId = await getCurrentUserId();
	return next({ context: { userId } });
});

/** API route middleware: puts the signed-in user in context, or responds 401. */
export const authedRequest = createMiddleware({ type: "request" }).server(
	async ({ request, next }) => {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session) return new Response("Unauthorized", { status: 401 });
		return next({ context: { userId: session.user.id, userEmail: session.user.email } });
	},
);
