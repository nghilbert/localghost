import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import {
	createContactInput,
	deleteContactInput,
	searchContactsInput,
	updateContactInput,
} from "#/features/contacts/lib/schemas";
import type { ContactModel } from "#/generated/prisma/models";
import { prisma } from "#/lib/db.server";

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
	return prisma.contact.findMany({
		where: { ownerId: userId },
		orderBy: { name: "asc" },
	});
});

export const createContact = createServerFn({ method: "POST" })
	.validator(createContactInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return prisma.contact.create({
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
	.validator(updateContactInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const { id, ...patch } = data;
		return prisma.contact.update({
			where: { id, ownerId: userId },
			data: patch,
		});
	});

export const deleteContact = createServerFn({ method: "POST" })
	.validator(deleteContactInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.contact.delete({ where: { id: data.id, ownerId: userId } });
		return { ok: true };
	});

export const searchContacts = createServerFn({ method: "POST" })
	.validator(searchContactsInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const q = data.query.toLowerCase();
		const all: ContactModel[] = await prisma.contact.findMany({ where: { ownerId: userId } });
		return all.filter((c) => {
			if (c.name.toLowerCase().includes(q)) return true;
			const emails = c.emails as string[];
			const phones = c.phones as string[];
			return emails.some((e) => e.toLowerCase().includes(q)) || phones.some((p) => p.includes(q));
		});
	});
