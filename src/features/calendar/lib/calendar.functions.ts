import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { syncCalDav } from "#/lib/caldav.server";
import { encrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

// ── Calendar CRUD ────────────────────────────────────────────────────────

export const getCalendars = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.calendarCal.findMany({
		where: { ownerId: userId },
		orderBy: { name: "asc" },
		select: { id: true, name: true, color: true, source: true, caldavUrl: true },
	});
});

export const createCalendar = createServerFn({ method: "POST" })
	.validator(
		z.object({
			name: z.string().min(1),
			color: z.string().default("#5b8abf"),
			source: z.enum(["local", "caldav"]).default("local"),
			caldavUrl: z.string().optional(),
			caldavUsername: z.string().optional(),
			caldavPassword: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return prisma.calendarCal.create({
			data: {
				name: data.name,
				color: data.color,
				source: data.source,
				caldavUrl: data.caldavUrl ?? null,
				caldavUsernameEncrypted: data.caldavUsername ? encrypt(data.caldavUsername) : null,
				caldavPasswordEncrypted: data.caldavPassword ? encrypt(data.caldavPassword) : null,
				ownerId: userId,
			},
		});
	});

export const deleteCalendar = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.calendarCal.deleteMany({ where: { id: data.id, ownerId: userId } });
	});

// ── Event CRUD ────────────────────────────────────────────────────────────

export const getEvents = createServerFn({ method: "GET" })
	.validator(
		z.object({
			start: z.string(),
			end: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return prisma.calendarEvent.findMany({
			where: {
				ownerId: userId,
				dtstart: { gte: new Date(data.start) },
				dtend: { lte: new Date(data.end) },
			},
			include: { calendar: { select: { id: true, name: true, color: true } } },
			orderBy: { dtstart: "asc" },
		});
	});

export const createEvent = createServerFn({ method: "POST" })
	.validator(
		z.object({
			calendarId: z.uuid(),
			summary: z.string().min(1),
			description: z.string().default(""),
			location: z.string().default(""),
			dtstart: z.string(),
			dtend: z.string(),
			allDay: z.boolean().default(false),
			rrule: z.string().optional(),
			color: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const cal = await prisma.calendarCal.findFirst({
			where: { id: data.calendarId, ownerId: userId },
		});
		if (!cal) throw new Error("Calendar not found");

		return prisma.calendarEvent.create({
			data: {
				calendarId: data.calendarId,
				summary: data.summary,
				description: data.description,
				location: data.location,
				dtstart: new Date(data.dtstart),
				dtend: new Date(data.dtend),
				allDay: data.allDay,
				rrule: data.rrule ?? null,
				color: data.color ?? null,
				ownerId: userId,
			},
		});
	});

export const updateEvent = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.uuid(),
			summary: z.string().min(1).optional(),
			description: z.string().optional(),
			location: z.string().optional(),
			dtstart: z.string().optional(),
			dtend: z.string().optional(),
			allDay: z.boolean().optional(),
			color: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const event = await prisma.calendarEvent.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!event) throw new Error("Event not found");

		const { id, ...updates } = data;
		return prisma.calendarEvent.update({
			where: { id },
			data: {
				...updates,
				dtstart: data.dtstart ? new Date(data.dtstart) : undefined,
				dtend: data.dtend ? new Date(data.dtend) : undefined,
			},
		});
	});

export const deleteEvent = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.calendarEvent.deleteMany({ where: { id: data.id, ownerId: userId } });
	});

// ── CalDAV sync ───────────────────────────────────────────────────────────

export const syncCalendar = createServerFn({ method: "POST" })
	.validator(z.object({ calendarId: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const cal = await prisma.calendarCal.findFirst({
			where: { id: data.calendarId, ownerId: userId },
		});
		if (!cal) throw new Error("Calendar not found");
		if (cal.source !== "caldav" || !cal.caldavUrl) throw new Error("Not a CalDAV calendar");

		const events = await syncCalDav({
			url: cal.caldavUrl,
			usernameEncrypted: cal.caldavUsernameEncrypted ?? "",
			passwordEncrypted: cal.caldavPasswordEncrypted ?? "",
		});

		// Upsert by UID
		let count = 0;
		for (const ev of events) {
			await prisma.calendarEvent.upsert({
				where: { id: ev.uid },
				create: {
					id: ev.uid,
					calendarId: cal.id,
					uid: ev.uid,
					summary: ev.summary,
					description: ev.description,
					location: ev.location,
					dtstart: ev.dtstart,
					dtend: ev.dtend,
					allDay: ev.allDay,
					rrule: ev.rrule,
					ownerId: userId,
				},
				update: {
					summary: ev.summary,
					description: ev.description,
					location: ev.location,
					dtstart: ev.dtstart,
					dtend: ev.dtend,
					allDay: ev.allDay,
					rrule: ev.rrule,
				},
			});
			count++;
		}

		return { synced: count };
	});

export const calendarsQueryOptions = () =>
	queryOptions({ queryKey: ["calendars"], queryFn: () => getCalendars() });

export const eventsQueryOptions = (start: string, end: string) =>
	queryOptions({
		queryKey: ["calendar-events", start, end],
		queryFn: () => getEvents({ data: { start, end } }),
		staleTime: 30_000,
	});
