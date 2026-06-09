import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import type { EventData } from "#/features/calendar/lib/calendar.types";

type EventDetailDialogProps = {
	event: EventData | null;
	onClose: () => void;
	onDelete: (id: string) => void;
	isDeletePending: boolean;
};

export function EventDetailDialog({
	event,
	onClose,
	onDelete,
	isDeletePending,
}: EventDetailDialogProps) {
	return (
		<Dialog open={!!event} onOpenChange={onClose}>
			{event && (
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>{event.summary}</DialogTitle>
					</DialogHeader>
					<div className="space-y-2 text-sm">
						<div className="flex items-center gap-2">
							<div
								className="h-3 w-3 shrink-0 rounded-full"
								style={{ backgroundColor: event.color ?? event.calendar.color }}
							/>
							<span className="text-muted-foreground">{event.calendar.name}</span>
						</div>
						<p className="text-muted-foreground">
							{new Date(event.dtstart).toLocaleString([], {
								dateStyle: "medium",
								timeStyle: "short",
							})}
							{" – "}
							{new Date(event.dtend).toLocaleString([], { timeStyle: "short" })}
						</p>
					</div>
					<div className="flex justify-end">
						<Button
							variant="destructive"
							size="sm"
							onClick={() => onDelete(event.id)}
							disabled={isDeletePending}
						>
							{isDeletePending ? "Deleting…" : "Delete event"}
						</Button>
					</div>
				</DialogContent>
			)}
		</Dialog>
	);
}
