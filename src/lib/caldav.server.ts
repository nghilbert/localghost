import ICAL from "ical.js";
import { createDAVClient } from "tsdav";
import { decrypt } from "#/lib/crypto.server";

export type CalDavEvent = {
	uid: string;
	summary: string;
	description: string;
	location: string;
	dtstart: Date;
	dtend: Date;
	allDay: boolean;
	rrule: string | null;
};

type CalDavConfig = {
	url: string;
	usernameEncrypted: string;
	passwordEncrypted: string;
};

/**
 * Pulls events from a CalDAV server for a date range (default: 90 days back, 365 days forward).
 */
export async function syncCalDav(
	config: CalDavConfig,
	start = subtractDays(new Date(), 90),
	end = addDays(new Date(), 365),
): Promise<CalDavEvent[]> {
	const username = decrypt(config.usernameEncrypted);
	const password = decrypt(config.passwordEncrypted);

	const client = await createDAVClient({
		serverUrl: config.url,
		credentials: { username, password },
		authMethod: "Basic",
		defaultAccountType: "caldav",
	});

	const calendars = await client.fetchCalendars();
	const events: CalDavEvent[] = [];

	for (const cal of calendars) {
		const objects = await client.fetchCalendarObjects({
			calendar: cal,
			timeRange: { start: start.toISOString(), end: end.toISOString() },
		});

		for (const obj of objects) {
			if (!obj.data) continue;
			try {
				const parsed = parseICS(obj.data);
				events.push(...parsed);
			} catch {
				// Skip malformed ICS objects
			}
		}
	}

	return events;
}

function parseICS(icsText: string): CalDavEvent[] {
	const jcal = ICAL.parse(icsText);
	const comp = new ICAL.Component(jcal);
	const vevents = comp.getAllSubcomponents("vevent");
	const results: CalDavEvent[] = [];

	for (const vevent of vevents) {
		try {
			const ev = new ICAL.Event(vevent);
			const dtstart = ev.startDate.toJSDate();
			const dtend = ev.endDate.toJSDate();
			const allDay = ev.startDate.isDate;

			const rruleProp = vevent.getFirstProperty("rrule");
			const rrule = rruleProp ? (rruleProp.getFirstValue()?.toString() ?? null) : null;

			results.push({
				uid: ev.uid,
				summary: ev.summary ?? "",
				description: ev.description ?? "",
				location: ev.location ?? "",
				dtstart,
				dtend,
				allDay,
				rrule,
			});
		} catch {
			// Skip individual malformed events
		}
	}

	return results;
}

function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function subtractDays(date: Date, days: number): Date {
	return addDays(date, -days);
}
