import { prisma } from "#/lib/db.server";
import { embed, toVectorLiteral } from "#/lib/embeddings.server";

type DocumentAction = "create" | "edit" | "update" | "list" | "read";

type EditPair = { find: string; replace: string };

type ManageDocumentsArgs = {
	action: DocumentAction;
	id?: string;
	title?: string;
	language?: string;
	content?: string;
	edits?: EditPair[];
	limit?: number;
};

export async function manageDocuments(args: ManageDocumentsArgs, ownerId: string): Promise<string> {
	switch (args.action) {
		case "list":
			return listDocuments(args, ownerId);
		case "read":
			return readDocument(args, ownerId);
		case "create":
			return createDocument(args, ownerId);
		case "edit":
			return editDocument(args, ownerId);
		case "update":
			return updateDocument(args, ownerId);
		default:
			return `Unknown document action: ${args.action}`;
	}
}

async function findDocument(id: string, ownerId: string) {
	const docs = await prisma.document.findMany({
		where: { ownerId, archived: false },
		orderBy: { updatedAt: "desc" },
	});
	return docs.find((d) => d.id === id || d.id.startsWith(id)) ?? null;
}

async function embedAndStore(docId: string, content: string, ownerId: string): Promise<void> {
	const embedding = await embed(content.slice(0, 8000), ownerId);
	if (!embedding) return;
	await prisma.$executeRawUnsafe(
		`UPDATE document SET embedding = $1::vector WHERE id = $2`,
		toVectorLiteral(embedding),
		docId,
	);
}

async function listDocuments(args: ManageDocumentsArgs, ownerId: string): Promise<string> {
	const limit = Math.min(args.limit ?? 20, 50);
	const docs = await prisma.document.findMany({
		where: { ownerId, archived: false },
		orderBy: { updatedAt: "desc" },
		take: limit,
		select: { id: true, title: true, language: true, updatedAt: true, versionCount: true },
	});
	if (docs.length === 0) return "No documents found.";
	return docs
		.map(
			(d) =>
				`[${d.id.slice(0, 8)}] "${d.title}" (${d.language}, v${d.versionCount}, updated ${d.updatedAt.toISOString().slice(0, 10)})`,
		)
		.join("\n");
}

async function readDocument(args: ManageDocumentsArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to read a document";
	const doc = await findDocument(args.id, ownerId);
	if (!doc) return `Document not found: ${args.id}`;
	const preview = doc.content?.slice(0, 2000) ?? "";
	return `# ${doc.title}\n\n${preview}${(doc.content?.length ?? 0) > 2000 ? "\n\n[...truncated]" : ""}`;
}

async function createDocument(args: ManageDocumentsArgs, ownerId: string): Promise<string> {
	if (!args.title?.trim()) return "title is required to create a document";
	const content = args.content ?? "";

	const doc = await prisma.document.create({
		data: {
			title: args.title,
			language: args.language ?? "markdown",
			content,
			versionCount: 1,
			ownerId,
		},
	});

	await prisma.documentVersion.create({
		data: {
			documentId: doc.id,
			versionNumber: 1,
			content,
			source: "agent",
		},
	});

	embedAndStore(doc.id, content, ownerId).catch(() => {});

	return `Document created (id: ${doc.id.slice(0, 8)}): "${doc.title}"`;
}

async function editDocument(args: ManageDocumentsArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to edit a document";
	if (!args.edits?.length) return "edits array is required to edit a document";

	const doc = await findDocument(args.id, ownerId);
	if (!doc) return `Document not found: ${args.id}`;

	let content = doc.content ?? "";
	const applied: string[] = [];
	const failed: string[] = [];

	for (const edit of args.edits) {
		if (content.includes(edit.find)) {
			content = content.replace(edit.find, edit.replace);
			applied.push(edit.find.slice(0, 40));
		} else {
			failed.push(edit.find.slice(0, 40));
		}
	}

	const newVersion = doc.versionCount + 1;
	await prisma.document.update({
		where: { id: doc.id },
		data: { content, versionCount: newVersion },
	});
	await prisma.documentVersion.create({
		data: { documentId: doc.id, versionNumber: newVersion, content, source: "agent" },
	});
	embedAndStore(doc.id, content, ownerId).catch(() => {});

	const report = [`Applied ${applied.length} edit(s) to "${doc.title}".`];
	if (failed.length) report.push(`Could not find: ${failed.map((s) => `"${s}"…`).join(", ")}`);
	return report.join(" ");
}

async function updateDocument(args: ManageDocumentsArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to update a document";
	if (args.content === undefined) return "content is required for a full document update";

	const doc = await findDocument(args.id, ownerId);
	if (!doc) return `Document not found: ${args.id}`;

	const newVersion = doc.versionCount + 1;
	await prisma.document.update({
		where: { id: doc.id },
		data: {
			content: args.content,
			versionCount: newVersion,
			...(args.title !== undefined ? { title: args.title } : {}),
			...(args.language !== undefined ? { language: args.language } : {}),
		},
	});
	await prisma.documentVersion.create({
		data: { documentId: doc.id, versionNumber: newVersion, content: args.content, source: "agent" },
	});
	embedAndStore(doc.id, args.content, ownerId).catch(() => {});

	return `Document "${args.title ?? doc.title}" updated to v${newVersion}.`;
}
