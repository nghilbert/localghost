import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod/v4";
import {
	addMemory,
	deleteMemory,
	memoriesQueryOptions,
	searchMemories,
} from "#/features/memory/lib/memory.functions";
import type { addMemoryInput } from "#/features/memory/lib/schemas";

/**
 * Owns the saved-memories list plus a vector/keyword search query (active once
 * `searchQuery` exceeds 2 chars) and the add/delete mutations. Add errors
 * surface inline via the form's `FieldError`.
 */
export function useMemories(searchQuery = "") {
	const queryClient = useQueryClient();
	const { data: memories = [] } = useQuery(memoriesQueryOptions());
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["memories"] });

	const { data: searchResults } = useQuery({
		queryKey: ["memories-search", searchQuery],
		queryFn: () => searchMemories({ data: { query: searchQuery, limit: 10 } }),
		enabled: searchQuery.length > 2,
		staleTime: 5_000,
	});

	const addMutation = useMutation({
		mutationFn: (data: z.input<typeof addMemoryInput>) => addMemory({ data }),
		onSuccess: () => {
			invalidate();
			toast.success("Memory saved");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteMemory({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Memory deleted");
		},
		onError: () => toast.error("Failed to delete memory"),
	});

	return {
		memories,
		searchResults,
		addMemory: addMutation,
		deleteMemory: deleteMutation,
	};
}
