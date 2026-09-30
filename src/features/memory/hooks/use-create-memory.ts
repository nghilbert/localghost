import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { createMemory } from "#/features/memory/memory.functions";
import { memoryQueries } from "#/features/memory/memory.queries";

/** Creates a memory from the Settings memory tab. */
export function useCreateMemory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (text: string) => createMemory({ data: { text } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: memoryQueries.all() });
			toast.add({ title: "Memory saved", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to save memory", type: "error", description: error.message }),
	});
}
