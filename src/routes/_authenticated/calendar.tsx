import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
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
	calendarsQueryOptions,
	createCalendar,
	createEvent,
	deleteEvent,
	eventsQueryOptions,
} from "#/features/calendar/lib/calendar.functions";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
	component: CalendarPage,
});

type EventData = {
	id: string;
	summary: string;
	dtstart: Date | string;
	dtend: Date | string;
	allDay: boolean;
	color: string | null;
	calendar: { id: string; name: string; color: string };
};

function CalendarPage() {
	const queryClient = useQueryClient();
	const [today] = useState(() => new Date());
	const [viewDate, setViewDate] = useState(() => {
		const d = new Date();
		d.setDate(1);
		return d;
	});
	const [newCalOpen, setNewCalOpen] = useState(false);
	const [newEventOpen, setNewEventOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);

	const { data: calendars = [] } = useQuery(calendarsQueryOptions());

	const rangeStart = useMemo(() => {
		const d = new Date(viewDate);
		d.setDate(1);
		d.setDate(d.getDate() - d.getDay()); // start of the week containing month start
		return d;
	}, [viewDate]);

	const rangeEnd = useMemo(() => {
		const d = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
		d.setDate(d.getDate() + (6 - d.getDay())); // end of last week
		return d;
	}, [viewDate]);

	const { data: events = [] } = useQuery(
		eventsQueryOptions(rangeStart.toISOString(), rangeEnd.toISOString()),
	);

	const weeks = useMemo(() => buildWeeks(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

	function prevMonth() {
		setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
	}

	function nextMonth() {
		setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
	}

	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteEvent({ data: { id } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar-events"] }),
	});

	return (
		<div className="flex h-full flex-col p-4 gap-3">
			{/* Header */}
			<div className="flex items-center gap-2">
				<Button variant="outline" size="icon" onClick={prevMonth}>
					<ChevronLeftIcon size={15} />
				</Button>
				<h2 className="flex-1 text-center text-base font-semibold">
					{viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
				</h2>
				<Button variant="outline" size="icon" onClick={nextMonth}>
					<ChevronRightIcon size={15} />
				</Button>
				<NewEventDialog
					open={newEventOpen}
					onOpenChange={setNewEventOpen}
					calendars={calendars}
					defaultDate={selectedDate ?? today}
					onCreated={() => queryClient.invalidateQueries({ queryKey: ["calendar-events"] })}
				/>
				<NewCalendarDialog
					open={newCalOpen}
					onOpenChange={setNewCalOpen}
					onCreated={() => queryClient.invalidateQueries({ queryKey: ["calendars"] })}
				/>
			</div>

			{/* Day-of-week headers */}
			<div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
				{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
					<div key={d} className="py-1">
						{d}
					</div>
				))}
			</div>

			{/* Calendar grid */}
			<div className="flex-1 overflow-auto">
				<div className="grid grid-cols-7 grid-rows-[repeat(6,minmax(80px,1fr))] h-full border-l border-t">
					{weeks.flat().map((day) => {
						const isCurrentMonth = day.getMonth() === viewDate.getMonth();
						const isToday = sameDay(day, today);
						const dayEvents = events.filter((e) => {
							const start = new Date(e.dtstart);
							return sameDay(start, day);
						});

						return (
							<div
								key={day.toISOString()}
								className={cn(
									"border-b border-r p-1 text-xs",
									!isCurrentMonth && "bg-muted/30 text-muted-foreground",
								)}
							>
								<button
									type="button"
									className={cn(
										"mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs",
										isToday && "bg-primary text-primary-foreground font-bold",
									)}
									onClick={() => {
										setSelectedDate(day);
										setNewEventOpen(true);
									}}
								>
									{day.getDate()}
								</button>
								<div className="space-y-0.5">
									{dayEvents.slice(0, 3).map((ev: EventData) => (
										<button
											key={ev.id}
											type="button"
											title={ev.summary}
											className="block w-full truncate rounded px-1 py-0.5 text-left text-[11px] text-white"
											style={{ backgroundColor: ev.color ?? ev.calendar.color }}
											onClick={() => deleteMut.mutate(ev.id)}
										>
											{ev.summary}
										</button>
									))}
									{dayEvents.length > 3 && (
										<p className="text-muted-foreground text-[10px] px-1">
											+{dayEvents.length - 3} more
										</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Legend */}
			{calendars.length > 0 && (
				<div className="flex flex-wrap gap-3">
					{calendars.map((cal) => (
						<div key={cal.id} className="flex items-center gap-1.5">
							<div className="h-3 w-3 rounded-full" style={{ backgroundColor: cal.color }} />
							<span className="text-xs text-muted-foreground">{cal.name}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function buildWeeks(start: Date, end: Date): Date[][] {
	const weeks: Date[][] = [];
	let week: Date[] = [];
	const cur = new Date(start);

	while (cur <= end) {
		week.push(new Date(cur));
		if (week.length === 7) {
			weeks.push(week);
			week = [];
		}
		cur.setDate(cur.getDate() + 1);
	}
	if (week.length) weeks.push(week);
	return weeks;
}

function sameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function NewEventDialog({
	open,
	onOpenChange,
	calendars,
	defaultDate,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	calendars: Array<{ id: string; name: string; color: string }>;
	defaultDate: Date;
	onCreated: () => void;
}) {
	const toDatetimeLocal = (d: Date) => {
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	};

	const [summary, setSummary] = useState("");
	const [calendarId, setCalendarId] = useState(() => calendars[0]?.id ?? "");
	const [dtstart, setDtstart] = useState(() => toDatetimeLocal(defaultDate));
	const [dtend, setDtend] = useState(() => {
		const end = new Date(defaultDate);
		end.setHours(end.getHours() + 1);
		return toDatetimeLocal(end);
	});

	const createMut = useMutation({
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
				<Button size="sm" className="gap-1">
					<PlusIcon size={13} />
					Event
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
						<select
							value={calendarId}
							onChange={(e) => setCalendarId(e.target.value)}
							className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
						>
							{calendars.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
					)}
					<Button
						onClick={() => createMut.mutate()}
						disabled={!summary || !calendarId || createMut.isPending}
					>
						Create
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function NewCalendarDialog({
	open,
	onOpenChange,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	onCreated: () => void;
}) {
	const [name, setName] = useState("");
	const [color, setColor] = useState("#5b8abf");

	const createMut = useMutation({
		mutationFn: () => createCalendar({ data: { name, color } }),
		onSuccess: () => {
			onCreated();
			onOpenChange(false);
			setName("");
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1">
					<PlusIcon size={13} />
					Calendar
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
					<Button onClick={() => createMut.mutate()} disabled={!name || createMut.isPending}>
						Create
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
