import { queryOptions } from "@tanstack/react-query";
import { listMemories } from "./memory.functions";

/** Query options for the user's saved memories. */
export const memoryQueries = {
	all: () => ["memory"] as const,
	list: () =>
		queryOptions({
			queryKey: [...memoryQueries.all(), "list"],
			queryFn: () => listMemories(),
		}),
};
