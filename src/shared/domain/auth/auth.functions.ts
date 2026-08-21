import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth, isSignUpOpen } from "#/shared/lib/auth.server";

export const getAuthSession = createServerFn({ method: "GET" }).handler(async () => {
	const headers = getRequestHeaders();
	return await auth.api.getSession({ headers });
});

/** Unauthenticated by design: the visitors who need this answer have no session yet. */
export const getSignUpAvailability = createServerFn({ method: "GET" }).handler(async () => ({
	open: await isSignUpOpen(),
}));

// ── Query options (for TanStack Query) ───────────────────────

export const signUpAvailabilityQueryOptions = () =>
	queryOptions({
		queryKey: ["sign-up-availability"],
		queryFn: () => getSignUpAvailability(),
	});
