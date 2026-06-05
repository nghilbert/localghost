import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";
import { embed, toVectorLiteral } from "#/lib/embeddings.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

const LANGUAGES = [
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

export const getDocuments = createServerFn({ method: "GET" })
	.inputValidator(z.object({ archived: z.boolean().default(false) }).optional())
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return prisma.document.findMany({
			where: { ownerId: userId, archived: data?.archived ?? false },
			orderBy: { updatedAt: "desc" },
			select: {
				id: true,
				title: true,
				language: true,
				versionCount: true,
				archived: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	});

export const getDocument = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const doc = await prisma.document.findFirst({
			where: { id: data.id, ownerId: userId },
			include: {
				versions: {
					orderBy: { versionNumber: "desc" },
					take: 20,
					select: {
						id: true,
						versionNumber: true,
						summary: true,
						source: true,
						createdAt: true,
					},
				},
			},
		});
		if (!doc) throw new Error("Document not found");
		return doc;
	});

export const createDocument = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			title: z.string().min(1).default("Untitled"),
			language: z.enum(LANGUAGES).default("markdown"),
			content: z.string().default(""),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();

		const doc = await prisma.document.create({
			data: {
				title: data.title,
				language: data.language,
				content: data.content,
				ownerId: userId,
				versionCount: 1,
			},
		});

		// Create the initial version
		await prisma.documentVersion.create({
			data: {
				documentId: doc.id,
				versionNumber: 1,
				content: data.content,
				summary: "Initial version",
				source: "user",
			},
		});

		// Embed in background — failures are non-fatal
		embedDocument(doc.id, data.content, userId).catch(() => {});

		return doc;
	});

export const updateDocument = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.uuid(),
			title: z.string().min(1).optional(),
			language: z.enum(LANGUAGES).optional(),
			content: z.string().optional(),
			summary: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const doc = await prisma.document.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!doc) throw new Error("Document not found");

		const updates: Record<string, unknown> = {};
		if (data.title !== undefined) updates.title = data.title;
		if (data.language !== undefined) updates.language = data.language;

		if (data.content !== undefined && data.content !== doc.content) {
			updates.content = data.content;
			updates.versionCount = { increment: 1 };

			const nextVersion = doc.versionCount + 1;
			await prisma.documentVersion.create({
				data: {
					documentId: doc.id,
					versionNumber: nextVersion,
					content: data.content,
					summary: data.summary ?? null,
					source: "user",
				},
			});

			embedDocument(doc.id, data.content, userId).catch(() => {});
		}

		return prisma.document.update({ where: { id: data.id }, data: updates });
	});

export const deleteDocument = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.document.deleteMany({ where: { id: data.id, ownerId: userId } });
	});

export const getDocumentVersion = createServerFn({ method: "GET" })
	.inputValidator(z.object({ versionId: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const version = await prisma.documentVersion.findFirst({
			where: { id: data.versionId, document: { ownerId: userId } },
		});
		if (!version) throw new Error("Version not found");
		return version;
	});

export const documentsQueryOptions = (archived = false) =>
	queryOptions({
		queryKey: ["documents", { archived }],
		queryFn: () => getDocuments({ data: { archived } }),
	});

export const documentQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["document", id],
		queryFn: () => getDocument({ data: { id } }),
	});

async function embedDocument(docId: string, content: string, ownerId: string) {
	const embedding = await embed(content.slice(0, 8000), ownerId);
	if (!embedding) return;
	await prisma.$executeRawUnsafe(
		`UPDATE document SET embedding = $1::vector WHERE id = $2`,
		toVectorLiteral(embedding),
		docId,
	);
}
