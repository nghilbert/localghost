import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod/v4";
import {
	createEndpoint,
	deleteEndpoint,
	endpointsQueryOptions,
	testEndpoint,
	updateEndpoint,
} from "#/features/endpoints/lib/endpoint.functions";
import type {
	createEndpointSchema,
	testEndpointInput,
	updateEndpointSchema,
} from "#/features/endpoints/lib/schemas";

export function useEndpoints() {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["endpoints"] });
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

	const createEndpointMutation = useMutation({
		mutationFn: (data: z.input<typeof createEndpointSchema>) => createEndpoint({ data }),
		onSuccess: () => {
			invalidate();
			toast.success("Provider added");
		},
		onError: (error) => toast.error(`Failed to add provider: ${error.message}`),
	});

	const updateEndpointMutation = useMutation({
		mutationFn: (vars: { id: string; data: z.input<typeof updateEndpointSchema> }) =>
			updateEndpoint({ data: vars }),
		onSuccess: () => {
			invalidate();
			toast.success("Provider updated");
		},
		onError: (error) => toast.error(`Failed to update provider: ${error.message}`),
	});

	const deleteEndpointMutation = useMutation({
		mutationFn: (id: string) => deleteEndpoint({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Provider removed");
		},
		onError: (error) => toast.error(`Failed to remove provider: ${error.message}`),
	});

	const testEndpointMutation = useMutation({
		mutationFn: (data: z.input<typeof testEndpointInput>) => testEndpoint({ data }),
	});

	return {
		endpoints,
		createEndpoint: createEndpointMutation,
		updateEndpoint: updateEndpointMutation,
		deleteEndpoint: deleteEndpointMutation,
		testEndpoint: testEndpointMutation,
	};
}
