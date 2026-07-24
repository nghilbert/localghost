import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth.server";

/** Resolves the authenticated user's id from the current request, or throws. */
export async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}
