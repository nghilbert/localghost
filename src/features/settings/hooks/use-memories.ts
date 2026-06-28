import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteSavedMemory } from "#/features/settings/lib/memory.functions";

/** Saved-memory mutations for the Settings memory tab. */
export function useMemories() {
	const queryClient = useQueryClient();

	const deleteMemory = useMutation({
		mutationFn: (id: string) => deleteSavedMemory({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["saved-memories"] });
			toast.success("Memory deleted");
		},
		onError: () => toast.error("Failed to delete memory"),
	});

	return { deleteMemory };
}
