import { prisma } from "#/lib/db.server";

type ChecklistItem = { text: string; done?: boolean };

type ManageNotesArgs = {
	action: "list" | "add" | "update" | "delete" | "toggle_item";
	id?: string;
	title?: string;
	content?: string;
	note_type?: "note" | "checklist";
	checklist_items?: ChecklistItem[];
	color?: string;
	label?: string;
	pinned?: boolean;
	archived?: boolean;
	due_date?: string;
	index?: number;
	limit?: number;
};

export async function manageNotes(args: ManageNotesArgs, ownerId: string): Promise<string> {
	switch (args.action) {
		case "list":
			return listNotes(args, ownerId);
		case "add":
			return addNote(args, ownerId);
		case "update":
			return updateNote(args, ownerId);
		case "delete":
			return deleteNote(args, ownerId);
		case "toggle_item":
			return toggleItem(args, ownerId);
		default:
			return `Unknown notes action: ${args.action}`;
	}
}

async function findNote(id: string, ownerId: string) {
	const notes = await prisma.note.findMany({
		where: { ownerId },
		orderBy: { createdAt: "desc" },
	});
	return notes.find((n) => n.id === id || n.id.startsWith(id)) ?? null;
}

async function listNotes(args: ManageNotesArgs, ownerId: string): Promise<string> {
	const limit = Math.min(args.limit ?? 20, 50);
	const notes = await prisma.note.findMany({
		where: {
			ownerId,
			archived: args.archived === true,
			...(args.label ? { label: args.label } : {}),
		},
		orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
		take: limit,
	});

	if (notes.length === 0) return "No notes found.";

	return notes
		.map((n) => {
			const items = Array.isArray(n.items) ? (n.items as ChecklistItem[]) : [];
			const preview =
				n.noteType === "checklist"
					? `[${items.filter((i) => i.done).length}/${items.length} done]`
					: (n.content?.slice(0, 60) ?? "");
			const flags = [n.pinned ? "📌" : "", n.color ? n.color : ""].filter(Boolean).join(" ");
			return `[${n.id.slice(0, 8)}] "${n.title || "(untitled)"}" (${n.noteType})${flags ? ` ${flags}` : ""}${preview ? ` — ${preview}` : ""}`;
		})
		.join("\n");
}

async function addNote(args: ManageNotesArgs, ownerId: string): Promise<string> {
	const noteType = args.note_type ?? (args.checklist_items !== undefined ? "checklist" : "note");

	const items =
		noteType === "checklist" && args.checklist_items
			? args.checklist_items.map((i) => ({ text: i.text, done: i.done ?? false }))
			: undefined;

	const dueDate = args.due_date ? parseDueDate(args.due_date) : undefined;

	const note = await prisma.note.create({
		data: {
			title: args.title ?? "",
			content: noteType === "note" ? (args.content ?? null) : null,
			items: items ?? undefined,
			noteType,
			color: args.color ?? null,
			label: args.label ?? null,
			pinned: args.pinned ?? false,
			dueDate: dueDate ?? null,
			ownerId,
		},
	});

	return `Note created (id: ${note.id.slice(0, 8)}): "${note.title || "(untitled)"}"`;
}

async function updateNote(args: ManageNotesArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to update a note";
	const note = await findNote(args.id, ownerId);
	if (!note) return `Note not found: ${args.id}`;

	const noteType = args.note_type ?? note.noteType;
	const dueDate = args.due_date !== undefined ? parseDueDate(args.due_date) : undefined;

	const existingItems = Array.isArray(note.items) ? (note.items as ChecklistItem[]) : [];
	const newItems =
		args.checklist_items !== undefined
			? args.checklist_items.map((i) => ({ text: i.text, done: i.done ?? false }))
			: existingItems;

	await prisma.note.update({
		where: { id: note.id },
		data: {
			...(args.title !== undefined ? { title: args.title } : {}),
			...(args.content !== undefined && noteType === "note" ? { content: args.content } : {}),
			noteType,
			items: noteType === "checklist" ? newItems : undefined,
			...(args.color !== undefined ? { color: args.color } : {}),
			...(args.label !== undefined ? { label: args.label } : {}),
			...(args.pinned !== undefined ? { pinned: args.pinned } : {}),
			...(args.archived !== undefined ? { archived: args.archived } : {}),
			...(dueDate !== undefined ? { dueDate } : {}),
		},
	});

	return `Note updated: "${args.title ?? (note.title || "(untitled)")}"`;
}

async function deleteNote(args: ManageNotesArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to delete a note";
	const note = await findNote(args.id, ownerId);
	if (!note) return `Note not found: ${args.id}`;
	await prisma.note.delete({ where: { id: note.id } });
	return `Note deleted: "${note.title || "(untitled)"}"`;
}

async function toggleItem(args: ManageNotesArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to toggle a checklist item";
	if (args.index === undefined) return "index is required to toggle a checklist item";
	const note = await findNote(args.id, ownerId);
	if (!note) return `Note not found: ${args.id}`;

	const items = Array.isArray(note.items) ? [...(note.items as ChecklistItem[])] : [];
	if (args.index < 0 || args.index >= items.length) {
		return `Index ${args.index} out of range (note has ${items.length} items)`;
	}

	const existing = items[args.index];
	items[args.index] = { text: existing?.text ?? "", done: !existing?.done };
	await prisma.note.update({ where: { id: note.id }, data: { items } });

	const item = items[args.index];
	return `Item ${args.index} "${item?.text}" marked ${item?.done ? "done" : "undone"}.`;
}

function parseDueDate(raw: string): Date | null {
	const d = new Date(raw);
	return Number.isNaN(d.getTime()) ? null : d;
}
