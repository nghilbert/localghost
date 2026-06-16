import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod/v4";
import type { createTaskInput, updateTaskInput } from "#/features/tasks/lib/schemas";
import {
	createTask,
	deleteTask,
	runTaskNow,
	tasksQueryOptions,
	updateTask,
} from "#/features/tasks/lib/task.functions";

/**
 * Owns the scheduled-tasks list plus create/update/delete/run mutations with
 * cache invalidation. Create errors surface inline via the form's `FieldError`;
 * a status change toasts pause/resume.
 */
export function useTasks() {
	const queryClient = useQueryClient();
	const { data: tasks = [] } = useQuery(tasksQueryOptions());
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

	const createMutation = useMutation({
		mutationFn: (data: z.infer<typeof createTaskInput>) => createTask({ data }),
		onSuccess: () => {
			invalidate();
			toast.success("Task created");
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: z.infer<typeof updateTaskInput>) => updateTask({ data }),
		onSuccess: (_, variables) => {
			invalidate();
			if (variables.status) {
				toast.success(variables.status === "active" ? "Task resumed" : "Task paused");
			}
		},
		onError: () => toast.error("Failed to update task"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteTask({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Task deleted");
		},
		onError: () => toast.error("Failed to delete task"),
	});

	const runMutation = useMutation({
		mutationFn: (id: string) => runTaskNow({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Task triggered");
		},
		onError: () => toast.error("Failed to run task"),
	});

	return {
		tasks,
		createTask: createMutation,
		updateTask: updateMutation,
		deleteTask: deleteMutation,
		runTask: runMutation,
	};
}
