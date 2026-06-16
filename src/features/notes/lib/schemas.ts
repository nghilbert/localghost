import { z } from "zod/v4";

export const checklistItemSchema = z.object({
	id: z.string(),
	text: z.string(),
	checked: z.boolean(),
});

/** Forgiving parser for the `Note.items` JSON column, yielding `[]` for any non-conforming value. */
export const checklistItemsSchema = z.array(checklistItemSchema).catch([]);

export const NoteFormSchema = z.object({
	title: z.string(),
	noteType: z.enum(["note", "checklist"]),
	content: z.string(),
	items: z.array(checklistItemSchema),
	color: z.string(),
	label: z.string(),
	pinned: z.boolean(),
});

export const createNoteInput = z.object({
	title: z.string().default(""),
	content: z.string().optional(),
	items: z.array(checklistItemSchema).optional(),
	noteType: z.enum(["note", "checklist"]).default("note"),
	color: z.string().optional(),
	label: z.string().optional(),
	pinned: z.boolean().default(false),
});

export const updateNoteInput = z.object({
	id: z.uuid(),
	title: z.string().optional(),
	content: z.string().optional(),
	items: z.array(checklistItemSchema).optional(),
	color: z.string().nullish(),
	label: z.string().nullish(),
	pinned: z.boolean().optional(),
	archived: z.boolean().optional(),
});

export const noteIdInput = z.object({ id: z.uuid() });
