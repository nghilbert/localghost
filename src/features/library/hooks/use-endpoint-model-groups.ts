import { useQueries, useQuery } from "@tanstack/react-query";
import { endpointQueries } from "#/features/endpoint/endpoint.queries";
import { libraryQueries } from "#/features/library/library.queries";

/**
 * Every endpoint's models, fetched only while `open`. The local llama.cpp endpoint uses
 * the Library's runtime status, so downloads and deletions show at once.
 */
export function useEndpointModelGroups(open: boolean) {
	const { data: endpoints = [] } = useQuery(endpointQueries.list());
	const { data: runtimeStatus, isPending: isRuntimePending } = useQuery(
		libraryQueries.runtimeStatus(),
	);
	const probedEndpoints = endpoints.filter((endpoint) => endpoint.id !== runtimeStatus?.endpointId);

	const results = useQueries({
		queries: probedEndpoints.map((endpoint) => ({
			...endpointQueries.models(endpoint.id),
			enabled: open,
		})),
	});
	const probedGroups = probedEndpoints
		.map((endpoint, i) => ({ endpoint, models: results[i]?.data ?? [] }))
		.filter((group) => group.models.length > 0);

	const runtimeEndpoint = endpoints.find((endpoint) => endpoint.id === runtimeStatus?.endpointId);
	const runtimeModels = runtimeStatus?.found ? runtimeStatus.installedModels.map((m) => m.id) : [];
	const groups =
		runtimeEndpoint && runtimeModels.length > 0
			? [{ endpoint: runtimeEndpoint, models: runtimeModels }, ...probedGroups]
			: probedGroups;

	return {
		groups,
		isLoading: isRuntimePending || results.some((result) => result.isLoading),
		isError: results.some((result) => result.isError),
	};
}
