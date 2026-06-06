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

const ChecklistItem = z.object({ id: z.string(), text: z.string(), checked: z.boolean() });

export const notesQueryOptions = () =>
	queryOptions({
		queryKey: ["notes"],
		queryFn: () => getNotes(),
	});

export const getNotes = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return db.note.findMany({
		where: { ownerId: userId, archived: false },
		orderBy: [{ pinned: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
	});
});

export const createNote = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			title: z.string().default(""),
			content: z.string().optional(),
			items: z.array(ChecklistItem).optional(),
			noteType: z.enum(["note", "checklist"]).default("note"),
			color: z.string().optional(),
			label: z.string().optional(),
			pinned: z.boolean().default(false),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return db.note.create({
			data: {
				...data,
				items: data.items ?? undefined,
				ownerId: userId,
			},
		});
	});

export const updateNote = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.uuid(),
			title: z.string().optional(),
			content: z.string().optional(),
			items: z.array(ChecklistItem).optional(),
			color: z.string().nullish(),
			label: z.string().nullish(),
			pinned: z.boolean().optional(),
			archived: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const { id, ...patch } = data;
		return db.note.update({
			where: { id, ownerId: userId },
			data: { ...patch, items: patch.items ?? undefined },
		});
	});

export const deleteNote = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await db.note.delete({ where: { id: data.id, ownerId: userId } });
		return { ok: true };
	});
