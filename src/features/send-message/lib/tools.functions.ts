import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUserId } from "#/shared/lib/session.server";

/** Which built-in tools this server is configured to offer (web search needs `SEARXNG_URL`). */
export const getToolAvailability = createServerFn({ method: "GET" }).handler(async () => {
	await getCurrentUserId();
	return { webSearch: Boolean(process.env.SEARXNG_URL) };
});

export const toolAvailabilityQueryOptions = () =>
	queryOptions({
		queryKey: ["tool-availability"],
		queryFn: () => getToolAvailability(),
		staleTime: Number.POSITIVE_INFINITY,
	});
