export type EventData = {
	id: string;
	summary: string;
	dtstart: Date | string;
	dtend: Date | string;
	allDay: boolean;
	color: string | null;
	calendar: { id: string; name: string; color: string };
};

export type CalendarData = {
	id: string;
	name: string;
	color: string;
};

export function buildWeeks(start: Date, end: Date): Date[][] {
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

export function sameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}
