import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import type { createTaskInput } from "#/features/tasks/lib/schemas";
import { createTask } from "#/features/tasks/lib/task.functions";

export function useCreateTask() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.infer<typeof createTaskInput>) => createTask({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
	});
}
