import { queryOptions } from "@tanstack/react-query";
import { MS_PER_MINUTE, MS_PER_SECOND } from "#/lib/format";
import type { ModelSelection } from "#/lib/llm-schemas";
import {
	checkEndpointHealth,
	getModelCapabilities,
	listEndpointModels,
	listEndpoints,
} from "./endpoint.functions";

/** Query options for saved endpoints, their models, health, and model capabilities. */
export const endpointQueries = {
	all: () => ["endpoint"] as const,
	list: () =>
		queryOptions({
			queryKey: [...endpointQueries.all(), "list"],
			queryFn: () => listEndpoints(),
		}),
	models: (endpointId: string) =>
		queryOptions({
			queryKey: [...endpointQueries.all(), "models", endpointId],
			queryFn: () => listEndpointModels({ data: { endpointId } }),
			staleTime: 30 * MS_PER_SECOND,
		}),
	health: (endpointId: string) =>
		queryOptions({
			queryKey: [...endpointQueries.all(), "health", endpointId],
			queryFn: () => checkEndpointHealth({ data: { id: endpointId } }),
			staleTime: 5 * MS_PER_MINUTE,
		}),
	capabilities: ({ endpointId, model }: ModelSelection) =>
		queryOptions({
			queryKey: [...endpointQueries.all(), "capabilities", endpointId, model],
			queryFn: () => getModelCapabilities({ data: { endpointId, model } }),
			staleTime: 5 * MS_PER_MINUTE,
		}),
};
