import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { deleteEndpoint } from "#/features/endpoint/endpoint.functions";
import { endpointQueries } from "#/features/endpoint/endpoint.queries";

/** Deletes a provider endpoint. */
export function useDeleteEndpoint() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteEndpoint({ data: { id } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: endpointQueries.all() });
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
