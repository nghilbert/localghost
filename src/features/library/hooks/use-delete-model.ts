import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { deleteModel } from "#/features/library/library.functions";
import { libraryQueries } from "#/features/library/library.queries";

/** Deletes an installed model. */
export function useDeleteModel() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: { endpointId: string; model: string }) => deleteModel({ data: input }),
		onSuccess: async (_data, { model }) => {
			await queryClient.invalidateQueries({ queryKey: libraryQueries.runtimeStatus().queryKey });
			toast.add({ title: `${model} deleted`, type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to delete model", type: "error", description: error.message }),
	});
}
