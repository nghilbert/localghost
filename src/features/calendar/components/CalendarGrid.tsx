import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { type CalendarData, type EventData, sameDay } from "#/features/calendar/lib/types";
import { cn } from "#/lib/utils";

const DAY_LABELS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

type CalendarGridProps = {
	weeks: Date[][];
	viewDate: Date;
	today: Date;
	events: EventData[];
	calendars: CalendarData[];
	onDayClick: (day: Date) => void;
	onEventClick: (event: EventData) => void;
};

export function CalendarGrid({
	weeks,
	viewDate,
	today,
	events,
	calendars,
	onDayClick,
	onEventClick,
}: CalendarGridProps) {
	return (
		<div className="flex flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
			{/* Day-of-week headers */}
			<div className="grid grid-cols-7 border-l border-t">
				{DAY_LABELS_FULL.map((d, i) => (
					<div
						key={d}
						className="border-b border-r py-1.5 text-center text-xs font-medium text-muted-foreground"
					>
						<span className="hidden sm:inline">{d}</span>
						<span className="sm:hidden">{DAY_LABELS_SHORT[i]}</span>
					</div>
				))}
			</div>

			{/* Week rows */}
			<div
				className="grid flex-1 grid-cols-7 overflow-auto border-l border-t"
				style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(60px, 1fr))` }}
			>
				{weeks.flat().map((day) => {
					const isCurrentMonth = day.getMonth() === viewDate.getMonth();
					const isToday = sameDay(day, today);
					const dayEvents = events.filter((e) => sameDay(new Date(e.dtstart), day));

					return (
						<div
							key={day.toISOString()}
							className={cn("border-b border-r p-1", !isCurrentMonth && "bg-muted/20")}
						>
							<Button
								variant={isToday ? "default" : "ghost"}
								size="icon-sm"
								className={cn(
									"mb-1 size-6 rounded-full text-xs",
									!isToday && "text-muted-foreground",
									!isCurrentMonth && "opacity-40",
								)}
								onClick={() => onDayClick(day)}
							>
								{day.getDate()}
							</Button>
							<div className="space-y-0.5">
								{dayEvents.slice(0, 2).map((ev) => (
									<Badge
										key={ev.id}
										asChild
										className="w-full justify-start border-transparent text-white"
										style={{ backgroundColor: ev.color ?? ev.calendar.color }}
									>
										<button type="button" title={ev.summary} onClick={() => onEventClick(ev)}>
											<span className="truncate">{ev.summary}</span>
										</button>
									</Badge>
								))}
								{dayEvents.length > 2 && (
									<p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 2}</p>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Calendar legend */}
			{calendars.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-3">
					{calendars.map((cal) => (
						<div key={cal.id} className="flex items-center gap-1.5">
							<div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cal.color }} />
							<span className="text-xs text-muted-foreground">{cal.name}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
