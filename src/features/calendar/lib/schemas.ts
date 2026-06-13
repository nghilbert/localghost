import { z } from "zod/v4";

// ── Calendar ────────────────────────────────────────────────────────────────

// Form draft shape — local calendars only need a name and color.
export const CreateCalendarFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	color: z.string(),
});

export const createCalendarDefaults: z.infer<typeof CreateCalendarFormSchema> = {
	name: "",
	color: "#5b8abf",
};

// Server input — supports CalDAV sources too.
export const createCalendarInput = z.object({
	name: z.string().min(1),
	color: z.string().default("#5b8abf"),
	source: z.enum(["local", "caldav"]).default("local"),
	caldavUrl: z.string().optional(),
	caldavUsername: z.string().optional(),
	caldavPassword: z.string().optional(),
});

export const deleteCalendarInput = z.object({ id: z.uuid() });

export const toCreateCalendarInput = (
	value: z.infer<typeof CreateCalendarFormSchema>,
): z.input<typeof createCalendarInput> => ({
	name: value.name.trim(),
	color: value.color,
});

// ── Event ───────────────────────────────────────────────────────────────────

// Form draft shape — datetime-local strings, single calendar pick.
export const CreateEventFormSchema = z.object({
	summary: z.string().trim().min(1, "Title is required"),
	calendarId: z.string().min(1, "Pick a calendar"),
	dtstart: z.string().min(1, "Start time is required"),
	dtend: z.string().min(1, "End time is required"),
});

export const createEventInput = z.object({
	calendarId: z.uuid(),
	summary: z.string().min(1),
	description: z.string().default(""),
	location: z.string().default(""),
	dtstart: z.string(),
	dtend: z.string(),
	allDay: z.boolean().default(false),
	rrule: z.string().optional(),
	color: z.string().optional(),
});

export const updateEventInput = z.object({
	id: z.uuid(),
	summary: z.string().min(1).optional(),
	description: z.string().optional(),
	location: z.string().optional(),
	dtstart: z.string().optional(),
	dtend: z.string().optional(),
	allDay: z.boolean().optional(),
	color: z.string().optional(),
});

export const deleteEventInput = z.object({ id: z.uuid() });

export const getEventsInput = z.object({ start: z.string(), end: z.string() });

export const syncCalendarInput = z.object({ calendarId: z.uuid() });

// Bridge the form draft into server input — datetime-local strings to ISO.
export const toCreateEventInput = (
	value: z.infer<typeof CreateEventFormSchema>,
): z.input<typeof createEventInput> => ({
	calendarId: value.calendarId,
	summary: value.summary.trim(),
	dtstart: new Date(value.dtstart).toISOString(),
	dtend: new Date(value.dtend).toISOString(),
});
