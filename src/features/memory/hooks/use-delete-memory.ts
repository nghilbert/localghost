import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { deleteMemory } from "#/features/memory/memory.functions";
import { memoryQueries } from "#/features/memory/memory.queries";

/** Deletes a saved memory. */
export function useDeleteMemory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteMemory({ data: { id } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: memoryQueries.all() });
			toast.add({ title: "Memory deleted", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to delete memory", type: "error", description: error.message }),
	});
}
