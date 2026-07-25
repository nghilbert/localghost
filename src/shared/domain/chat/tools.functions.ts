import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { authedFn } from "#/shared/lib/middleware";

/** Which built-in tools this server is configured to offer (web search needs `SEARXNG_URL`). */
export const getToolAvailability = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async () => ({ webSearch: Boolean(process.env.SEARXNG_URL) }));

export const toolAvailabilityQueryOptions = () =>
	queryOptions({
		queryKey: ["tool-availability"],
		queryFn: () => getToolAvailability(),
		staleTime: Number.POSITIVE_INFINITY,
	});
