import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod/v4";
import {
	createEndpoint,
	deleteEndpoint,
	endpointsQueryOptions,
	testEndpoint,
	updateEndpoint,
} from "#/entities/endpoint/endpoint.functions";
import type {
	createEndpointSchema,
	testEndpointInput,
	updateEndpointSchema,
} from "#/entities/endpoint/schemas";

export function useEndpoints() {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["endpoints"] });
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

	const createEndpointMutation = useMutation({
		mutationFn: (data: z.input<typeof createEndpointSchema>) => createEndpoint({ data }),
		onSuccess: () => {
			invalidate();
			toast.success("Provider endpoint added");
		},
		onError: (error) =>
			toast.error("Failed to add provider endpoint", { description: error.message }),
	});

	const updateEndpointMutation = useMutation({
		mutationFn: (vars: { id: string; data: z.input<typeof updateEndpointSchema> }) =>
			updateEndpoint({ data: vars }),
		onSuccess: () => {
			invalidate();
			toast.success("Provider endpoint updated");
		},
		onError: (error) =>
			toast.error("Failed to update provider endpoint", { description: error.message }),
	});

	const deleteEndpointMutation = useMutation({
		mutationFn: (id: string) => deleteEndpoint({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Provider endpoint removed");
		},
		onError: (error) =>
			toast.error("Failed to remove provider endpoint", { description: error.message }),
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
