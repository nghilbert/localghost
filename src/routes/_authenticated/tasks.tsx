import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "#/components/PageHeader";
import { CreateTaskDialog } from "#/features/tasks/components/CreateTaskDialog";
import { TaskCard } from "#/features/tasks/components/TaskCard";
import {
	deleteTask,
	runTaskNow,
	tasksQueryOptions,
	updateTask,
} from "#/features/tasks/lib/task.functions";

export const Route = createFileRoute("/_authenticated/tasks")({
	component: TasksPage,
});

function TasksPage() {
	const queryClient = useQueryClient();
	const { data: tasks = [] } = useQuery(tasksQueryOptions());

	function invalidate() {
		queryClient.invalidateQueries({ queryKey: ["tasks"] });
	}

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteTask({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Task deleted");
		},
		onError: () => toast.error("Failed to delete task"),
	});

	const toggleMutation = useMutation({
		mutationFn: ({ id, status }: { id: string; status: "active" | "paused" }) =>
			updateTask({ data: { id, status } }),
		onSuccess: (_, { status }) => {
			invalidate();
			toast.success(status === "active" ? "Task resumed" : "Task paused");
		},
	});

	const runNowMutation = useMutation({
		mutationFn: (id: string) => runTaskNow({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Task triggered");
		},
		onError: () => toast.error("Failed to run task"),
	});

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Scheduled Tasks"
				description="Run LLM prompts on a schedule."
				actions={<CreateTaskDialog />}
			/>
			<div className="flex-1 overflow-auto">
				<div className="mx-auto max-w-3xl p-6">
					{tasks.length === 0 && (
						<div className="flex flex-col items-center gap-3 py-16 text-center">
							<p className="text-muted-foreground">No scheduled tasks yet</p>
						</div>
					)}
					<ul className="space-y-2">
						{tasks.map((task) => (
							<TaskCard
								key={task.id}
								task={task}
								onDelete={() => deleteMutation.mutate(task.id)}
								onToggle={() =>
									toggleMutation.mutate({
										id: task.id,
										status: task.status === "active" ? "paused" : "active",
									})
								}
								onRunNow={() => runNowMutation.mutate(task.id)}
								isDeletePending={deleteMutation.isPending}
								isTogglePending={toggleMutation.isPending}
								isRunNowPending={runNowMutation.isPending}
							/>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}
