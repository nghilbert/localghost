import { prisma } from "#/lib/db.server";

type CalendarAction =
	| "list_events"
	| "create_event"
	| "update_event"
	| "delete_event"
	| "list_calendars";

type ManageCalendarArgs = {
	action: CalendarAction;
	summary?: string;
	dtstart?: string;
	dtend?: string;
	all_day?: boolean;
	description?: string;
	location?: string;
	uid?: string;
	calendar?: string;
	start?: string;
	end?: string;
	event_type?: string;
	rrule?: string;
};

export async function manageCalendar(args: ManageCalendarArgs, ownerId: string): Promise<string> {
	switch (args.action) {
		case "list_calendars":
			return listCalendars(ownerId);
		case "list_events":
			return listEvents(args, ownerId);
		case "create_event":
			return createEvent(args, ownerId);
		case "update_event":
			return updateEvent(args, ownerId);
		case "delete_event":
			return deleteEvent(args, ownerId);
		default:
			return `Unknown calendar action: ${args.action}`;
	}
}

async function getDefaultCalendar(ownerId: string, calendarFilter?: string) {
	const where = calendarFilter
		? {
				ownerId,
				OR: [
					{ name: { contains: calendarFilter, mode: "insensitive" as const } },
					{ id: calendarFilter },
				],
			}
		: { ownerId };

	const cal = await prisma.calendarCal.findFirst({ where, orderBy: { createdAt: "asc" } });
	return cal;
}

async function findEvent(uid: string, ownerId: string) {
	return prisma.calendarEvent.findFirst({
		where: {
			ownerId,
			OR: [{ uid }, { id: uid }],
		},
	});
}

async function listCalendars(ownerId: string): Promise<string> {
	const cals = await prisma.calendarCal.findMany({
		where: { ownerId },
		orderBy: { name: "asc" },
	});
	if (cals.length === 0) return "No calendars found.";
	return cals.map((c) => `[${c.id.slice(0, 8)}] ${c.name} (${c.source})`).join("\n");
}

async function listEvents(args: ManageCalendarArgs, ownerId: string): Promise<string> {
	const start = args.start ? new Date(args.start) : new Date();
	const end = args.end ? new Date(args.end) : new Date(Date.now() + 14 * 86_400_000);

	const cal = args.calendar ? await getDefaultCalendar(ownerId, args.calendar) : null;

	const events = await prisma.calendarEvent.findMany({
		where: {
			ownerId,
			...(cal ? { calendarId: cal.id } : {}),
			dtstart: { gte: start, lte: end },
		},
		orderBy: { dtstart: "asc" },
		take: 50,
		include: { calendar: { select: { name: true } } },
	});

	if (events.length === 0) return "No events in that range.";

	return events
		.map((e) => {
			const when = e.allDay
				? e.dtstart.toISOString().slice(0, 10)
				: `${e.dtstart.toISOString()} – ${e.dtend.toISOString()}`;
			return `[${e.uid ?? e.id.slice(0, 8)}] ${e.summary} (${when}) [${e.calendar.name}]`;
		})
		.join("\n");
}

async function createEvent(args: ManageCalendarArgs, ownerId: string): Promise<string> {
	if (!args.summary) return "summary is required to create an event";
	if (!args.dtstart) return "dtstart is required to create an event";

	const cal = await getDefaultCalendar(ownerId, args.calendar);
	if (!cal) return "No calendar found. Create a calendar first in the Calendar section.";

	const dtstart = new Date(args.dtstart);
	let dtend: Date;
	if (args.dtend) {
		dtend = new Date(args.dtend);
	} else if (args.all_day) {
		dtend = new Date(dtstart);
		dtend.setUTCDate(dtend.getUTCDate() + 1);
	} else {
		dtend = new Date(dtstart.getTime() + 60 * 60 * 1000);
	}

	const event = await prisma.calendarEvent.create({
		data: {
			calendarId: cal.id,
			summary: args.summary,
			description: args.description ?? "",
			location: args.location ?? "",
			dtstart,
			dtend,
			allDay: args.all_day ?? false,
			rrule: args.rrule ?? null,
			ownerId,
		},
	});

	return `Event created (id: ${event.id.slice(0, 8)}): "${event.summary}" on ${dtstart.toISOString()}`;
}

async function updateEvent(args: ManageCalendarArgs, ownerId: string): Promise<string> {
	if (!args.uid) return "uid is required to update an event";
	const event = await findEvent(args.uid, ownerId);
	if (!event) return `Event not found: ${args.uid}`;

	const dtstart = args.dtstart ? new Date(args.dtstart) : event.dtstart;
	const dtend = args.dtend ? new Date(args.dtend) : event.dtend;

	await prisma.calendarEvent.update({
		where: { id: event.id },
		data: {
			...(args.summary !== undefined ? { summary: args.summary } : {}),
			...(args.description !== undefined ? { description: args.description } : {}),
			...(args.location !== undefined ? { location: args.location } : {}),
			dtstart,
			dtend,
			...(args.all_day !== undefined ? { allDay: args.all_day } : {}),
			...(args.rrule !== undefined ? { rrule: args.rrule } : {}),
		},
	});

	return `Event updated: "${args.summary ?? event.summary}"`;
}

async function deleteEvent(args: ManageCalendarArgs, ownerId: string): Promise<string> {
	if (!args.uid) return "uid is required to delete an event";
	const event = await findEvent(args.uid, ownerId);
	if (!event) return `Event not found: ${args.uid}`;
	await prisma.calendarEvent.delete({ where: { id: event.id } });
	return `Event deleted: "${event.summary}"`;
}
