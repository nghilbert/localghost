import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { CalendarGrid } from "#/features/calendar/components/CalendarGrid";
import { EventDetailDialog } from "#/features/calendar/components/EventDetailDialog";
import { NewCalendarDialog } from "#/features/calendar/components/NewCalendarDialog";
import { NewEventDialog } from "#/features/calendar/components/NewEventDialog";
import {
	calendarsQueryOptions,
	deleteEvent,
	eventsQueryOptions,
} from "#/features/calendar/lib/calendar.functions";
import { buildWeeks, type EventData } from "#/features/calendar/lib/types";

export const Route = createFileRoute("/_authenticated/calendar")({
	component: CalendarPage,
});

function CalendarPage() {
	const queryClient = useQueryClient();
	const [today] = useState(() => new Date());
	const [viewDate, setViewDate] = useState(() => {
		const d = new Date();
		d.setDate(1);
		return d;
	});
	const [isNewEventOpen, setIsNewEventOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [detailEvent, setDetailEvent] = useState<EventData | null>(null);

	const { data: calendars = [] } = useQuery(calendarsQueryOptions());

	const rangeStart = useMemo(() => {
		const d = new Date(viewDate);
		d.setDate(1);
		d.setDate(d.getDate() - d.getDay());
		return d;
	}, [viewDate]);

	const rangeEnd = useMemo(() => {
		const d = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
		d.setDate(d.getDate() + (6 - d.getDay()));
		return d;
	}, [viewDate]);

	const { data: events = [] } = useQuery(
		eventsQueryOptions(rangeStart.toISOString(), rangeEnd.toISOString()),
	);

	const weeks = useMemo(() => buildWeeks(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteEvent({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
			setDetailEvent(null);
			toast.success("Event deleted");
		},
		onError: () => toast.error("Failed to delete event"),
	});

	function handleDayClick(day: Date) {
		setSelectedDate(day);
		setIsNewEventOpen(true);
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title={viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
				actions={
					<div className="flex items-center gap-1.5">
						<Button
							variant="outline"
							size="icon"
							className="h-8 w-8"
							onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
						>
							<ChevronLeftIcon size={14} />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="h-8 w-8"
							onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
						>
							<ChevronRightIcon size={14} />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="text-xs"
							onClick={() => {
								const d = new Date();
								d.setDate(1);
								setViewDate(d);
							}}
						>
							Today
						</Button>
						<NewEventDialog
							open={isNewEventOpen}
							onOpenChange={setIsNewEventOpen}
							calendars={calendars}
							defaultDate={selectedDate ?? today}
							onCreated={() => {
								queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
								toast.success("Event created");
							}}
						/>
						<NewCalendarDialog
							onCreated={() => {
								queryClient.invalidateQueries({ queryKey: ["calendars"] });
								toast.success("Calendar created");
							}}
						/>
					</div>
				}
			/>

			<CalendarGrid
				weeks={weeks}
				viewDate={viewDate}
				today={today}
				events={events}
				calendars={calendars}
				onDayClick={handleDayClick}
				onEventClick={setDetailEvent}
			/>

			<EventDetailDialog
				event={detailEvent}
				onClose={() => setDetailEvent(null)}
				onDelete={(id) => deleteMutation.mutate(id)}
				isDeletePending={deleteMutation.isPending}
			/>
		</div>
	);
}
