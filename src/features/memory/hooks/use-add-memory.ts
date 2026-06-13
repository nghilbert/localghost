import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { addMemory } from "#/features/memory/lib/memory.functions";
import type { addMemoryInput } from "#/features/memory/lib/schemas";

export function useAddMemory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.input<typeof addMemoryInput>) => addMemory({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["memories"] }),
	});
}
