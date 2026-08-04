import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/shared/components/ui/toast";
import { createMemory, deleteMemory, updateMemory } from "#/shared/domain/memory/memory.functions";

function useInvalidateMemories() {
	const queryClient = useQueryClient();

	return () => queryClient.invalidateQueries({ queryKey: ["memories"] });
}

/** Creates a memory from the Settings memory tab. */
export function useCreateMemory() {
	const invalidateMemories = useInvalidateMemories();

	return useMutation({
		mutationFn: (text: string) => createMemory({ data: { text } }),
		onSuccess: async () => {
			await invalidateMemories();
			toast.add({ title: "Memory saved", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to save memory", type: "error", description: error.message }),
	});
}

/** Updates an existing saved memory. */
export function useUpdateMemory() {
	const invalidateMemories = useInvalidateMemories();

	return useMutation({
		mutationFn: ({ id, text }: { id: string; text: string }) =>
			updateMemory({ data: { id, text } }),
		onSuccess: async () => {
			await invalidateMemories();
			toast.add({ title: "Memory updated", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to update memory", type: "error", description: error.message }),
	});
}

/** Deletes an existing saved memory. */
export function useDeleteMemory() {
	const invalidateMemories = useInvalidateMemories();

	return useMutation({
		mutationFn: (id: string) => deleteMemory({ data: { id } }),
		onSuccess: async () => {
			await invalidateMemories();
			toast.add({ title: "Memory deleted", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to delete memory", type: "error", description: error.message }),
	});
}
