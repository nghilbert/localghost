import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/features/auth/lib/auth.server";

export const getAuthSession = createServerFn({ method: "GET" }).handler(async () => {
	const headers = getRequestHeaders();
	return await auth.api.getSession({ headers });
});

export const ensureAuthSession = createServerFn({ method: "GET" }).handler(async () => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });

	if (!session) throw new Error("Unauthorized");
	return session;
});
