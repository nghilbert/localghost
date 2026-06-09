import { PauseIcon, PlayIcon, Trash2Icon, ZapIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { SCHEDULE_LABELS, type Task } from "#/features/tasks/lib/types";
import { cn } from "#/lib/utils";
import { TaskRunsDialog } from "./TaskRunsDialog";

type TaskCardProps = {
	task: Task;
	onDelete: () => void;
	onToggle: () => void;
	onRunNow: () => void;
	isDeletePending: boolean;
	isTogglePending: boolean;
	isRunNowPending: boolean;
};

export function TaskCard({
	task,
	onDelete,
	onToggle,
	onRunNow,
	isDeletePending,
	isTogglePending,
	isRunNowPending,
}: TaskCardProps) {
	const lastRun = task.runs[0];
	const isActive = task.status === "active";

	return (
		<li className="flex items-start gap-3 rounded-lg border p-4">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className={cn("text-sm font-medium", !isActive && "text-muted-foreground")}>
						{task.name}
					</span>
					<span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
						{SCHEDULE_LABELS[task.schedule] ?? task.schedule}
					</span>
					<span
						className={cn(
							"rounded px-1.5 py-0.5 text-xs",
							isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
						)}
					>
						{task.status}
					</span>
				</div>
				{task.prompt && (
					<p className="mt-1 truncate text-xs text-muted-foreground">{task.prompt}</p>
				)}
				<div className="mt-1 flex gap-3 text-xs text-muted-foreground">
					<span>Runs: {task.runCount}</span>
					{task.nextRun && (
						<span>
							Next:{" "}
							{new Date(task.nextRun).toLocaleString([], {
								dateStyle: "short",
								timeStyle: "short",
							})}
						</span>
					)}
					{lastRun && (
						<span className={lastRun.status === "error" ? "text-destructive" : ""}>
							Last: {lastRun.status}
						</span>
					)}
				</div>
			</div>

			<div className="flex shrink-0 gap-1">
				<TaskRunsDialog taskId={task.id} taskName={task.name} />
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={onRunNow}
					disabled={isRunNowPending}
					aria-label="Run now"
					title="Run now"
				>
					<ZapIcon size={13} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={onToggle}
					disabled={isTogglePending}
					aria-label={isActive ? "Pause" : "Resume"}
				>
					{isActive ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-destructive hover:text-destructive"
					onClick={onDelete}
					disabled={isDeletePending}
					aria-label="Delete task"
				>
					<Trash2Icon size={13} />
				</Button>
			</div>
		</li>
	);
}
