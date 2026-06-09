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
import { createCalendar } from "#/features/calendar/lib/calendar.functions";

type NewCalendarDialogProps = {
	onCreated: () => void;
};

export function NewCalendarDialog({ onCreated }: NewCalendarDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [name, setName] = useState("");
	const [color, setColor] = useState("#5b8abf");

	const createMutation = useMutation({
		mutationFn: () => createCalendar({ data: { name, color } }),
		onSuccess: () => {
			onCreated();
			setIsOpen(false);
			setName("");
		},
	});

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
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<Input
						placeholder="Calendar name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						autoFocus
					/>
					<div className="flex items-center gap-2">
						<label htmlFor="cal-color" className="text-sm text-muted-foreground">
							Color
						</label>
						<input
							id="cal-color"
							type="color"
							value={color}
							onChange={(e) => setColor(e.target.value)}
							className="h-8 w-16 cursor-pointer rounded border"
						/>
					</div>
					<Button
						onClick={() => createMutation.mutate()}
						disabled={!name || createMutation.isPending}
					>
						{createMutation.isPending ? "Creating…" : "Create calendar"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
