import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { toast } from "#/shared/components/ui/toast";
import {
	createEndpoint,
	deleteEndpoint,
	endpointsQueryOptions,
	testEndpoint,
	updateEndpoint,
} from "./endpoint.functions";
import type { createEndpointSchema, testEndpointInput, updateEndpointSchema } from "./schemas";

/** Returns the saved provider endpoints. */
export function useEndpointQuery() {
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

	return endpoints;
}

function useInvalidateEndpoints() {
	const queryClient = useQueryClient();

	return () => queryClient.invalidateQueries({ queryKey: ["endpoints"] });
}

/** Creates a provider endpoint. */
export function useCreateEndpoint() {
	const invalidateEndpoints = useInvalidateEndpoints();

	return useMutation({
		mutationFn: (data: z.input<typeof createEndpointSchema>) => createEndpoint({ data }),
		onSuccess: async () => {
			await invalidateEndpoints();
			toast.add({ title: "Provider endpoint added", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to add provider endpoint",
				type: "error",
				description: error.message,
			}),
	});
}

/** Updates a provider endpoint. */
export function useUpdateEndpoint() {
	const queryClient = useQueryClient();
	const invalidateEndpoints = useInvalidateEndpoints();

	return useMutation({
		mutationFn: (vars: { id: string; data: z.input<typeof updateEndpointSchema> }) =>
			updateEndpoint({ data: vars }),
		onSuccess: async (_result, vars) => {
			await Promise.all([
				invalidateEndpoints(),
				queryClient.invalidateQueries({ queryKey: ["endpoint-health", vars.id] }),
			]);
			toast.add({ title: "Provider endpoint updated", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to update provider endpoint",
				type: "error",
				description: error.message,
			}),
	});
}

/** Deletes a provider endpoint. */
export function useDeleteEndpoint() {
	const invalidateEndpoints = useInvalidateEndpoints();

	return useMutation({
		mutationFn: (id: string) => deleteEndpoint({ data: { id } }),
		onSuccess: async () => {
			await invalidateEndpoints();
			toast.add({ title: "Provider endpoint removed", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to remove provider endpoint",
				type: "error",
				description: error.message,
			}),
	});
}

/** Tests an endpoint without saving it. */
export function useTestEndpoint() {
	return useMutation({
		mutationFn: (data: z.input<typeof testEndpointInput>) => testEndpoint({ data }),
	});
}
