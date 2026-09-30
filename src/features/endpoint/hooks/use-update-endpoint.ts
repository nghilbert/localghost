import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { toast } from "#/components/ui/toast";
import { updateEndpoint } from "#/features/endpoint/endpoint.functions";
import { endpointQueries } from "#/features/endpoint/endpoint.queries";
import type { updateEndpointSchema } from "#/features/endpoint/endpoint.schemas";

/** Updates a provider endpoint. */
export function useUpdateEndpoint() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (vars: { id: string; data: z.input<typeof updateEndpointSchema> }) =>
			updateEndpoint({ data: vars }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: endpointQueries.all() });
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
