import { useQuery } from "@tanstack/react-query";
import { ClockIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "#/components/ui/empty";
import { Item, ItemGroup } from "#/components/ui/item";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { taskRunsQueryOptions } from "#/features/tasks/lib/task.functions";
import { cn } from "#/lib/utils";

type TaskRunsDialogProps = {
	taskId: string;
	taskName: string;
};

export function TaskRunsDialog({ taskId, taskName }: TaskRunsDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const { data: runs = [], isLoading } = useQuery({
		...taskRunsQueryOptions(taskId),
		enabled: isOpen,
	});

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DialogTrigger asChild>
						<Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Run history">
							<ClockIcon size={13} />
						</Button>
					</DialogTrigger>
				</TooltipTrigger>
				<TooltipContent>Run history</TooltipContent>
			</Tooltip>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Run History — {taskName}</DialogTitle>
					<DialogDescription>Past executions for this scheduled task.</DialogDescription>
				</DialogHeader>
				{isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>}
				{!isLoading && runs.length === 0 && (
					<Empty className="border-0 py-6">
						<EmptyHeader>
							<EmptyTitle>No runs yet</EmptyTitle>
							<EmptyDescription>This task hasn't executed yet.</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
				{runs.length > 0 && (
					<ScrollArea className="max-h-96">
						<ItemGroup>
							{runs.map((run) => (
								<Item key={run.id} variant="outline" className="flex-col items-start gap-1">
									<div className="flex w-full items-center justify-between">
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
									{run.error && <p className="text-xs text-destructive">{run.error}</p>}
									{run.output && (
										<p className="line-clamp-3 text-xs text-muted-foreground">{run.output}</p>
									)}
								</Item>
							))}
						</ItemGroup>
					</ScrollArea>
				)}
			</DialogContent>
		</Dialog>
	);
}
