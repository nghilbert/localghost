import { z } from "zod/v4";

export const DOCUMENT_LANGUAGES = [
	"markdown",
	"text",
	"python",
	"javascript",
	"typescript",
	"html",
	"css",
	"json",
	"yaml",
	"sql",
	"bash",
] as const;

export const listDocumentsInput = z.object({ archived: z.boolean().default(false) }).optional();

export const documentIdInput = z.object({ id: z.uuid() });

export const createDocumentInput = z.object({
	title: z.string().min(1).default("Untitled"),
	language: z.enum(DOCUMENT_LANGUAGES).default("markdown"),
	content: z.string().default(""),
});

export const updateDocumentInput = z.object({
	id: z.uuid(),
	title: z.string().min(1).optional(),
	language: z.enum(DOCUMENT_LANGUAGES).optional(),
	content: z.string().optional(),
	summary: z.string().optional(),
});

export const documentVersionIdInput = z.object({ versionId: z.uuid() });
