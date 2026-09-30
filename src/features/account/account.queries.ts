import { queryOptions } from "@tanstack/react-query";
import { getUserSettings } from "./account.functions";

/** Query options for the user's chat defaults. */
export const accountQueries = {
	all: () => ["account"] as const,
	settings: () =>
		queryOptions({
			queryKey: [...accountQueries.all(), "settings"],
			queryFn: () => getUserSettings(),
		}),
};
