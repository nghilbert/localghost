import { PlusIcon } from "lucide-react";
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
import { CreateCalendarForm } from "#/features/calendar/components/CreateCalendarForm";

export function CreateCalendarDialog() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-1">
					<PlusIcon size={13} />
					<span className="hidden sm:inline">Calendar</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>New Calendar</DialogTitle>
					<DialogDescription>Create a local calendar to organize events.</DialogDescription>
				</DialogHeader>
				<CreateCalendarForm onSuccess={() => setIsOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}
