import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod/v4";
import {
	createEndpoint,
	deleteEndpoint,
	endpointsQueryOptions,
	testEndpoint,
} from "#/features/chat/lib/chat.functions";
import type { createEndpointSchema, testEndpointInput } from "#/features/chat/lib/schemas";

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
		deleteEndpoint: deleteEndpointMutation,
		testEndpoint: testEndpointMutation,
	};
}
