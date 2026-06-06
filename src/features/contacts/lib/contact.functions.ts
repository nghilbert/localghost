import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { prisma as db } from "#/lib/db.server";

async function getCurrentUserId(): Promise<string> {
	const { auth } = await import("#/features/auth/lib/auth.server");
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const contactsQueryOptions = () =>
	queryOptions({
		queryKey: ["contacts"],
		queryFn: () => getContacts(),
	});

export const getContacts = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return db.contact.findMany({
		where: { ownerId: userId },
		orderBy: { name: "asc" },
	});
});

export const createContact = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			name: z.string().min(1),
			emails: z.array(z.string()).default([]),
			phones: z.array(z.string()).default([]),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return db.contact.create({
			data: {
				name: data.name,
				emails: data.emails,
				phones: data.phones,
				notes: data.notes,
				ownerId: userId,
			},
		});
	});

export const updateContact = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.uuid(),
			name: z.string().min(1).optional(),
			emails: z.array(z.string()).optional(),
			phones: z.array(z.string()).optional(),
			notes: z.string().nullish(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const { id, ...patch } = data;
		return db.contact.update({
			where: { id, ownerId: userId },
			data: patch,
		});
	});

export const deleteContact = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await db.contact.delete({ where: { id: data.id, ownerId: userId } });
		return { ok: true };
	});

export const searchContacts = createServerFn({ method: "POST" })
	.inputValidator(z.object({ query: z.string() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const q = data.query.toLowerCase();
		const all = await db.contact.findMany({ where: { ownerId: userId } });
		return all.filter((c) => {
			if (c.name.toLowerCase().includes(q)) return true;
			const emails = c.emails as string[];
			const phones = c.phones as string[];
			return emails.some((e) => e.toLowerCase().includes(q)) || phones.some((p) => p.includes(q));
		});
	});
