import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/components/PageHeader";
import { CreateTaskDialog } from "#/features/tasks/components/CreateTaskDialog";
import { TaskCard } from "#/features/tasks/components/TaskCard";
import { useTasks } from "#/features/tasks/hooks/use-tasks";

export const Route = createFileRoute("/_authenticated/tasks")({
	component: TasksPage,
});

function TasksPage() {
	const { tasks, updateTask, deleteTask, runTask } = useTasks();

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
								onDelete={() => deleteTask.mutate(task.id)}
								onToggle={() =>
									updateTask.mutate({
										id: task.id,
										status: task.status === "active" ? "paused" : "active",
									})
								}
								onRunNow={() => runTask.mutate(task.id)}
								isDeletePending={deleteTask.isPending}
								isTogglePending={updateTask.isPending}
								isRunNowPending={runTask.isPending}
							/>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}
