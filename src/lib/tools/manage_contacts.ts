import { prisma } from "#/lib/db.server";

type ContactAction = "list" | "add" | "update" | "delete" | "resolve";

type ManageContactsArgs = {
	action: ContactAction;
	id?: string;
	name?: string;
	email?: string;
	phone?: string;
	notes?: string;
	query?: string;
	limit?: number;
};

export async function manageContacts(args: ManageContactsArgs, ownerId: string): Promise<string> {
	switch (args.action) {
		case "list":
			return listContacts(args, ownerId);
		case "add":
			return addContact(args, ownerId);
		case "update":
			return updateContact(args, ownerId);
		case "delete":
			return deleteContact(args, ownerId);
		case "resolve":
			return resolveContact(args, ownerId);
		default:
			return `Unknown contacts action: ${args.action}`;
	}
}

async function findContact(id: string, ownerId: string) {
	const contacts = await prisma.contact.findMany({ where: { ownerId } });
	return contacts.find((c) => c.id === id || c.id.startsWith(id)) ?? null;
}

async function listContacts(args: ManageContactsArgs, ownerId: string): Promise<string> {
	const limit = Math.min(args.limit ?? 20, 50);
	const contacts = await prisma.contact.findMany({
		where: { ownerId },
		orderBy: { name: "asc" },
		take: limit,
	});

	if (contacts.length === 0) return "No contacts found.";

	return contacts
		.map((c) => {
			const emails = Array.isArray(c.emails) ? (c.emails as string[]) : [];
			const phones = Array.isArray(c.phones) ? (c.phones as string[]) : [];
			const detail = [emails[0], phones[0]].filter(Boolean).join(", ");
			return `[${c.id.slice(0, 8)}] ${c.name}${detail ? ` — ${detail}` : ""}`;
		})
		.join("\n");
}

async function addContact(args: ManageContactsArgs, ownerId: string): Promise<string> {
	if (!args.name?.trim()) return "name is required to add a contact";

	const emails = args.email ? [args.email] : [];
	const phones = args.phone ? [args.phone] : [];

	const contact = await prisma.contact.create({
		data: {
			name: args.name,
			emails,
			phones,
			notes: args.notes ?? null,
			source: "agent",
			ownerId,
		},
	});

	return `Contact created (id: ${contact.id.slice(0, 8)}): ${contact.name}`;
}

async function updateContact(args: ManageContactsArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to update a contact";
	const contact = await findContact(args.id, ownerId);
	if (!contact) return `Contact not found: ${args.id}`;

	const emails = args.email
		? [args.email]
		: Array.isArray(contact.emails)
			? (contact.emails as string[])
			: [];
	const phones = args.phone
		? [args.phone]
		: Array.isArray(contact.phones)
			? (contact.phones as string[])
			: [];

	await prisma.contact.update({
		where: { id: contact.id },
		data: {
			...(args.name !== undefined ? { name: args.name } : {}),
			emails,
			phones,
			...(args.notes !== undefined ? { notes: args.notes } : {}),
		},
	});

	return `Contact updated: ${args.name ?? contact.name}`;
}

async function deleteContact(args: ManageContactsArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to delete a contact";
	const contact = await findContact(args.id, ownerId);
	if (!contact) return `Contact not found: ${args.id}`;
	await prisma.contact.delete({ where: { id: contact.id } });
	return `Contact deleted: ${contact.name}`;
}

async function resolveContact(args: ManageContactsArgs, ownerId: string): Promise<string> {
	const query = args.query ?? args.name;
	if (!query?.trim()) return "query or name is required to resolve a contact";

	const contacts = await prisma.contact.findMany({
		where: {
			ownerId,
			name: { contains: query, mode: "insensitive" },
		},
		take: 5,
		orderBy: { name: "asc" },
	});

	if (contacts.length === 0) return `No contact found matching "${query}"`;

	return contacts
		.map((c) => {
			const emails = Array.isArray(c.emails) ? (c.emails as string[]) : [];
			const phones = Array.isArray(c.phones) ? (c.phones as string[]) : [];
			return `${c.name} — email: ${emails[0] ?? "(none)"}, phone: ${phones[0] ?? "(none)"}`;
		})
		.join("\n");
}
