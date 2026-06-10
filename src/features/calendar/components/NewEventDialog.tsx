import { useMutation } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { NativeSelect, NativeSelectOption } from "#/components/ui/native-select";
import { createEvent } from "#/features/calendar/lib/calendar.functions";
import type { CalendarData } from "#/features/calendar/lib/types";

type NewEventDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	calendars: CalendarData[];
	defaultDate: Date;
	onCreated: () => void;
};

function toDatetimeLocal(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewEventDialog({
	open,
	onOpenChange,
	calendars,
	defaultDate,
	onCreated,
}: NewEventDialogProps) {
	const [summary, setSummary] = useState("");
	const [calendarId, setCalendarId] = useState(() => calendars[0]?.id ?? "");
	const [dtstart, setDtstart] = useState(() => toDatetimeLocal(defaultDate));
	const [dtend, setDtend] = useState(() => {
		const end = new Date(defaultDate);
		end.setHours(end.getHours() + 1);
		return toDatetimeLocal(end);
	});

	// Reset date fields each time the dialog opens so clicked day is reflected
	useEffect(() => {
		if (open) {
			setDtstart(toDatetimeLocal(defaultDate));
			const end = new Date(defaultDate);
			end.setHours(end.getHours() + 1);
			setDtend(toDatetimeLocal(end));
		}
	}, [open, defaultDate]);

	const createMutation = useMutation({
		mutationFn: () =>
			createEvent({
				data: {
					calendarId,
					summary,
					dtstart: new Date(dtstart).toISOString(),
					dtend: new Date(dtend).toISOString(),
				},
			}),
		onSuccess: () => {
			onCreated();
			onOpenChange(false);
			setSummary("");
		},
	});

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
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<Input
						placeholder="Event title"
						value={summary}
						onChange={(e) => setSummary(e.target.value)}
						autoFocus
					/>
					<div className="grid grid-cols-2 gap-2">
						<div className="flex flex-col gap-1">
							<label htmlFor="ev-dtstart" className="text-xs text-muted-foreground">
								Start
							</label>
							<Input
								id="ev-dtstart"
								type="datetime-local"
								value={dtstart}
								onChange={(e) => setDtstart(e.target.value)}
								className="text-xs"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label htmlFor="ev-dtend" className="text-xs text-muted-foreground">
								End
							</label>
							<Input
								id="ev-dtend"
								type="datetime-local"
								value={dtend}
								onChange={(e) => setDtend(e.target.value)}
								className="text-xs"
							/>
						</div>
					</div>
					{calendars.length > 0 && (
						<NativeSelect
							value={calendarId}
							onChange={(e) => setCalendarId(e.target.value)}
							className="w-full"
						>
							{calendars.map((c) => (
								<NativeSelectOption key={c.id} value={c.id}>
									{c.name}
								</NativeSelectOption>
							))}
						</NativeSelect>
					)}
					<Button
						onClick={() => createMutation.mutate()}
						disabled={!summary || !calendarId || createMutation.isPending}
					>
						{createMutation.isPending ? "Creating…" : "Create event"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
