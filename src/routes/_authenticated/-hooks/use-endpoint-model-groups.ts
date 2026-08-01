import { useQueries, useQuery } from "@tanstack/react-query";
import { endpointModelsQueryOptions } from "#/shared/domain/endpoint/endpoint.functions";
import { useEndpoints } from "#/shared/domain/endpoint/use-endpoints";
import { libraryStatusQueryOptions } from "#/shared/domain/model/model.functions";

/**
 * Resolves every endpoint's models in one place, fetched only while `open`.
 *
 * The local llama.cpp endpoint reads `libraryStatusQueryOptions` (the Library
 * page's own live source) instead of probing its own `/models`, so a just
 * deleted or downloaded model is reflected immediately.
 */
export function useEndpointModelGroups(open: boolean) {
	const { endpoints } = useEndpoints();
	const { data: runtimeStatus, isPending: isRuntimePending } = useQuery(
		libraryStatusQueryOptions(),
	);
	const probedEndpoints = endpoints.filter((endpoint) => endpoint.id !== runtimeStatus?.endpointId);

	const results = useQueries({
		queries: probedEndpoints.map((endpoint) => ({
			...endpointModelsQueryOptions(endpoint.id),
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
