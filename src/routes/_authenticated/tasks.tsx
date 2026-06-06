import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PauseIcon, PlayIcon, PlusIcon, Trash2Icon, ZapIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import {
	createTask,
	deleteTask,
	runTaskNow,
	tasksQueryOptions,
	updateTask,
} from "#/features/tasks/lib/task.functions";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authenticated/tasks")({
	component: TasksPage,
});

const SCHEDULE_LABELS: Record<string, string> = {
	once: "Once",
	daily: "Daily",
	weekly: "Weekly",
	monthly: "Monthly",
	cron: "Custom cron",
};

function TasksPage() {
	const queryClient = useQueryClient();
	const { data: tasks = [] } = useQuery(tasksQueryOptions());
	const [createOpen, setCreateOpen] = useState(false);

	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteTask({ data: { id } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
	});

	const toggleMut = useMutation({
		mutationFn: ({ id, status }: { id: string; status: "active" | "paused" }) =>
			updateTask({ data: { id, status } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
	});

	const runNowMut = useMutation({
		mutationFn: (id: string) => runTaskNow({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});

	return (
		<div className="mx-auto max-w-3xl p-6">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">Scheduled Tasks</h1>
					<p className="text-sm text-muted-foreground">
						Run LLM prompts on a schedule and deliver results to a chat session.
					</p>
				</div>
				<CreateTaskDialog
					open={createOpen}
					onOpenChange={setCreateOpen}
					onCreated={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
				/>
			</div>

			{tasks.length === 0 && (
				<div className="flex flex-col items-center gap-3 py-16 text-center">
					<p className="text-muted-foreground">No scheduled tasks yet</p>
				</div>
			)}

			<ul className="space-y-2">
				{tasks.map((task) => {
					const lastRun = task.runs[0];
					const isActive = task.status === "active";

					return (
						<li key={task.id} className="flex items-start gap-3 rounded-lg border p-4">
							<div className="flex-1 min-w-0">
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
											isActive
												? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
												: "bg-muted text-muted-foreground",
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
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									onClick={() => runNowMut.mutate(task.id)}
									disabled={runNowMut.isPending}
									aria-label="Run now"
									title="Run now"
								>
									<ZapIcon size={13} />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									onClick={() =>
										toggleMut.mutate({
											id: task.id,
											status: isActive ? "paused" : "active",
										})
									}
									disabled={toggleMut.isPending}
									aria-label={isActive ? "Pause" : "Resume"}
								>
									{isActive ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 text-destructive hover:text-destructive"
									onClick={() => deleteMut.mutate(task.id)}
									disabled={deleteMut.isPending}
									aria-label="Delete task"
								>
									<Trash2Icon size={13} />
								</Button>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

function CreateTaskDialog({
	open,
	onOpenChange,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	onCreated: () => void;
}) {
	const [name, setName] = useState("");
	const [prompt, setPrompt] = useState("");
	const [schedule, setSchedule] = useState<"daily" | "weekly" | "monthly" | "once" | "cron">(
		"daily",
	);
	const [scheduledTime, setScheduledTime] = useState("09:00");
	const [cronExpression, setCronExpression] = useState("0 9 * * *");

	const createMut = useMutation({
		mutationFn: () =>
			createTask({
				data: {
					name,
					prompt,
					schedule,
					scheduledTime: schedule !== "once" && schedule !== "cron" ? scheduledTime : undefined,
					cronExpression: schedule === "cron" ? cronExpression : undefined,
				},
			}),
		onSuccess: () => {
			onCreated();
			onOpenChange(false);
			setName("");
			setPrompt("");
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-1">
					<PlusIcon size={13} />
					New Task
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Create Scheduled Task</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<Input placeholder="Task name" value={name} onChange={(e) => setName(e.target.value)} />
					<textarea
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						placeholder="LLM prompt to run on schedule…"
						rows={4}
						className="resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
					/>
					<div className="flex gap-3">
						<div className="flex flex-col gap-1 flex-1">
							<label htmlFor="task-schedule" className="text-xs text-muted-foreground">
								Schedule
							</label>
							<select
								id="task-schedule"
								value={schedule}
								onChange={(e) => setSchedule(e.target.value as typeof schedule)}
								className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
							>
								{Object.entries(SCHEDULE_LABELS).map(([v, l]) => (
									<option key={v} value={v}>
										{l}
									</option>
								))}
							</select>
						</div>
						{schedule !== "once" && schedule !== "cron" && (
							<div className="flex flex-col gap-1">
								<label htmlFor="task-time" className="text-xs text-muted-foreground">
									Time (UTC)
								</label>
								<Input
									id="task-time"
									type="time"
									value={scheduledTime}
									onChange={(e) => setScheduledTime(e.target.value)}
									className="w-28"
								/>
							</div>
						)}
						{schedule === "cron" && (
							<div className="flex flex-col gap-1 flex-1">
								<label htmlFor="task-cron" className="text-xs text-muted-foreground">
									Cron expression
								</label>
								<Input
									id="task-cron"
									value={cronExpression}
									onChange={(e) => setCronExpression(e.target.value)}
									placeholder="0 9 * * *"
								/>
							</div>
						)}
					</div>
					<Button
						onClick={() => createMut.mutate()}
						disabled={!name || !prompt || createMut.isPending}
					>
						{createMut.isPending ? "Creating…" : "Create Task"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
