import { PlusIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { CreateEventForm } from "#/features/calendar/components/CreateEventForm";
import type { CalendarData } from "#/features/calendar/lib/types";

type CreateEventDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	calendars: CalendarData[];
	defaultDate: Date;
};

export function CreateEventDialog({
	open,
	onOpenChange,
	calendars,
	defaultDate,
}: CreateEventDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button size="sm" className="h-8 gap-1">
					<PlusIcon size={13} />
					<span className="hidden sm:inline">Event</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>New Event</DialogTitle>
					<DialogDescription>Add an event to one of your calendars.</DialogDescription>
				</DialogHeader>
				<CreateEventForm
					calendars={calendars}
					defaultDate={defaultDate}
					onSuccess={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}
