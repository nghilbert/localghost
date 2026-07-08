import { useQueries } from "@tanstack/react-query";
import { endpointModelsQueryOptions } from "#/entities/endpoint/endpoint.functions";
import { useEndpoints } from "#/entities/endpoint/use-endpoints";

/** Resolves every endpoint's models in one place, fetched only while `open`. */
export function useEndpointModelGroups(open: boolean) {
	const { endpoints } = useEndpoints();
	const results = useQueries({
		queries: endpoints.map((endpoint) => ({
			...endpointModelsQueryOptions(endpoint.id),
			enabled: open,
		})),
	});
	const groups = endpoints
		.map((endpoint, i) => ({ endpoint, models: results[i]?.data ?? [] }))
		.filter((group) => group.models.length > 0);

	return {
		groups,
		isLoading: results.some((result) => result.isLoading),
		isError: results.some((result) => result.isError),
	};
}
