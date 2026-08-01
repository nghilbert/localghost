import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/shared/components/ui/toast";
import { createMemory, deleteMemory, updateMemory } from "#/shared/domain/memory/memory.functions";

/** Saved-memory mutations for the Settings memory tab. */
export function useMemories() {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["memories"] });

	const createMemoryMutation = useMutation({
		mutationFn: (text: string) => createMemory({ data: { text } }),
		onSuccess: () => {
			invalidate();
			toast.add({ title: "Memory saved", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to save memory", type: "error", description: error.message }),
	});

	const updateMemoryMutation = useMutation({
		mutationFn: ({ id, text }: { id: string; text: string }) =>
			updateMemory({ data: { id, text } }),
		onSuccess: () => {
			invalidate();
			toast.add({ title: "Memory updated", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to update memory", type: "error", description: error.message }),
	});

	const deleteMemoryMutation = useMutation({
		mutationFn: (id: string) => deleteMemory({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.add({ title: "Memory deleted", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to delete memory", type: "error", description: error.message }),
	});

	return { createMemoryMutation, updateMemoryMutation, deleteMemoryMutation };
}
