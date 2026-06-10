import { useQuery } from "@tanstack/react-query";
import { ClockIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { getTaskRuns } from "#/features/tasks/lib/task.functions";
import { cn } from "#/lib/utils";

type TaskRunsDialogProps = {
	taskId: string;
	taskName: string;
};

export function TaskRunsDialog({ taskId, taskName }: TaskRunsDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const { data: runs = [], isLoading } = useQuery({
		queryKey: ["task-runs", taskId],
		queryFn: () => getTaskRuns({ data: { taskId } }),
		enabled: isOpen,
	});

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					aria-label="Run history"
					title="Run history"
				>
					<ClockIcon size={13} />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Run History — {taskName}</DialogTitle>
				</DialogHeader>
				{isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>}
				{!isLoading && runs.length === 0 && (
					<p className="py-4 text-center text-sm text-muted-foreground">No runs yet.</p>
				)}
				{runs.length > 0 && (
					<ul className="max-h-96 space-y-2 overflow-y-auto">
						{runs.map((run) => (
							<li key={run.id}>
								<Card size="sm">
									<CardContent>
										<div className="flex items-center justify-between">
											<span
												className={cn(
													"text-xs font-medium",
													run.status === "error"
														? "text-destructive"
														: run.status === "success"
															? "text-primary"
															: "text-muted-foreground",
												)}
											>
												{run.status}
											</span>
											<span className="text-xs text-muted-foreground">
												{new Date(run.startedAt).toLocaleString([], {
													dateStyle: "short",
													timeStyle: "short",
												})}
											</span>
										</div>
										{run.error && <p className="mt-1 text-xs text-destructive">{run.error}</p>}
										{run.output && (
											<p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
												{run.output}
											</p>
										)}
									</CardContent>
								</Card>
							</li>
						))}
					</ul>
				)}
			</DialogContent>
		</Dialog>
	);
}
