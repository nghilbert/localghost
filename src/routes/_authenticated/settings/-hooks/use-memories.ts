import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createMemory, deleteMemory, updateMemory } from "#/entities/memory/memory.functions";

/** Saved-memory mutations for the Settings memory tab. */
export function useMemories() {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["memories"] });

	const createMemoryMutation = useMutation({
		mutationFn: (text: string) => createMemory({ data: { text } }),
		onSuccess: () => {
			invalidate();
			toast.success("Memory saved");
		},
		onError: (error) => toast.error("Failed to save memory", { description: error.message }),
	});

	const updateMemoryMutation = useMutation({
		mutationFn: ({ id, text }: { id: string; text: string }) =>
			updateMemory({ data: { id, text } }),
		onSuccess: () => {
			invalidate();
			toast.success("Memory updated");
		},
		onError: (error) => toast.error("Failed to update memory", { description: error.message }),
	});

	const deleteMemoryMutation = useMutation({
		mutationFn: (id: string) => deleteMemory({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Memory deleted");
		},
		onError: (error) => toast.error("Failed to delete memory", { description: error.message }),
	});

	return { createMemoryMutation, updateMemoryMutation, deleteMemoryMutation };
}
