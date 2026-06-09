import { useMutation } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
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
import { Textarea } from "#/components/ui/textarea";
import { createTask } from "#/features/tasks/lib/task.functions";
import { SCHEDULE_LABELS } from "#/features/tasks/lib/task.types";

type CreateTaskDialogProps = {
	onCreated: () => void;
};

type Schedule = "daily" | "weekly" | "monthly" | "once" | "cron";

export function CreateTaskDialog({ onCreated }: CreateTaskDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [name, setName] = useState("");
	const [prompt, setPrompt] = useState("");
	const [schedule, setSchedule] = useState<Schedule>("daily");
	const [scheduledTime, setScheduledTime] = useState("09:00");
	const [cronExpression, setCronExpression] = useState("0 9 * * *");

	const createMutation = useMutation({
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
			setIsOpen(false);
			setName("");
			setPrompt("");
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
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
					<Textarea
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						placeholder="LLM prompt to run on schedule…"
						rows={4}
						className="resize-none"
					/>
					<div className="flex gap-3">
						<div className="flex flex-1 flex-col gap-1">
							<label htmlFor="task-schedule" className="text-xs text-muted-foreground">
								Schedule
							</label>
							<select
								id="task-schedule"
								value={schedule}
								onChange={(e) => setSchedule(e.target.value as Schedule)}
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
							<div className="flex flex-1 flex-col gap-1">
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
						onClick={() => createMutation.mutate()}
						disabled={!name || !prompt || createMutation.isPending}
					>
						{createMutation.isPending ? "Creating…" : "Create Task"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
