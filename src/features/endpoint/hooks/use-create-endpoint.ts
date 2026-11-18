import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { toast } from "#/components/ui/toast";
import { createEndpoint } from "#/lib/endpoint/endpoint.functions";
import { endpointQueries } from "#/lib/endpoint/endpoint.queries";
import type { createEndpointSchema } from "#/lib/endpoint/endpoint.schemas";

/** Creates a provider endpoint. */
export function useCreateEndpoint() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: z.input<typeof createEndpointSchema>) => createEndpoint({ data }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: endpointQueries.all() });
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
