import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteMemory } from "#/features/settings/lib/memory.functions";

/** Saved-memory mutations for the Settings memory tab. */
export function useMemories() {
	const queryClient = useQueryClient();

	const deleteMemoryMutation = useMutation({
		mutationFn: (id: string) => deleteMemory({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["memories"] });
			toast.success("Memory deleted");
		},
		onError: (error) => toast.error("Failed to delete memory", { description: error.message }),
	});

	return { deleteMemoryMutation };
}
