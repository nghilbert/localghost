import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { updateMemory } from "#/features/memory/memory.functions";
import { memoryQueries } from "#/features/memory/memory.queries";

/** Updates a saved memory's text. */
export function useUpdateMemory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, text }: { id: string; text: string }) =>
			updateMemory({ data: { id, text } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: memoryQueries.all() });
			toast.add({ title: "Memory updated", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to update memory", type: "error", description: error.message }),
	});
}
