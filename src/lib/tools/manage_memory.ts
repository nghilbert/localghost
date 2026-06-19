import { z } from "zod/v4";
import { prisma } from "#/lib/db.server";
import { embed, toVectorLiteral } from "#/lib/tools/embeddings.server";

export const manageMemoryArgsSchema = z.object({
	action: z.enum(["add", "search", "list", "delete"]),
	text: z.string().optional(),
	query: z.string().optional(),
	id: z.string().optional(),
	category: z.string().optional(),
	limit: z.coerce.number().optional(),
});

type ManageMemoryArgs = z.infer<typeof manageMemoryArgsSchema>;

/**
 * Tool handler for memory management. Called by the agent loop when the LLM
 * invokes the manage_memory tool.
 */
export async function manageMemory(args: ManageMemoryArgs, ownerId: string): Promise<string> {
	switch (args.action) {
		case "add":
			return addMemory(args, ownerId);
		case "search":
			return searchMemory(args, ownerId);
		case "list":
			return listMemories(args, ownerId);
		case "delete":
			return deleteMemory(args, ownerId);
		default:
			return `Unknown memory action: ${args.action}`;
	}
}

async function addMemory(args: ManageMemoryArgs, ownerId: string): Promise<string> {
	if (!args.text?.trim()) return "text is required to add a memory";

	const embedding = await embed(args.text, ownerId);

	await prisma.$executeRaw`
		INSERT INTO memory (text, category, source, owner_id, embedding)
		VALUES (
			${args.text},
			${args.category ?? "fact"},
			'agent',
			${ownerId}::uuid,
			${embedding ? toVectorLiteral(embedding) : null}::vector
		)`;

	return `Memory saved: "${args.text.slice(0, 80)}${args.text.length > 80 ? "…" : ""}"`;
}

export type RecalledMemory = { text: string; category: string };

/**
 * Vector-similarity recall (with a keyword fallback when no embedding endpoint
 * is configured) over the user's memories. Shared by the `manage_memory` search
 * action and the automatic recall injected into every chat's system prompt.
 */
export async function recallMemories(
	ownerId: string,
	query: string,
	limit = 5,
): Promise<RecalledMemory[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	const capped = Math.min(limit, 20);
	const embedding = await embed(trimmed, ownerId);

	if (embedding) {
		// Vector similarity search when embeddings are available.
		return prisma.$queryRaw<RecalledMemory[]>`
			SELECT text, category
			FROM memory
			WHERE owner_id = ${ownerId}::uuid AND embedding IS NOT NULL
			ORDER BY embedding <=> ${toVectorLiteral(embedding)}::vector
			LIMIT ${capped}`;
	}
	// Full-text keyword fallback when no embedding endpoint is configured.
	return prisma.$queryRaw<RecalledMemory[]>`
		SELECT text, category
		FROM memory
		WHERE owner_id = ${ownerId}::uuid AND lower(text) LIKE lower(${`%${trimmed}%`})
		LIMIT ${capped}`;
}

async function searchMemory(args: ManageMemoryArgs, ownerId: string): Promise<string> {
	const query = args.query?.trim();
	if (!query) return "query is required to search memories";

	const rows = await recallMemories(ownerId, query, args.limit ?? 5);
	if (rows.length === 0) return "No matching memories found.";
	return rows.map((r, i) => `[${i + 1}] (${r.category}) ${r.text}`).join("\n");
}

async function listMemories(args: ManageMemoryArgs, ownerId: string): Promise<string> {
	const limit = Math.min(args.limit ?? 10, 50);
	const memories = await prisma.memory.findMany({
		where: { ownerId },
		orderBy: { createdAt: "desc" },
		take: limit,
		select: { id: true, text: true, category: true, createdAt: true },
	});

	if (memories.length === 0) return "No memories saved yet.";
	return memories.map((m, i) => `[${i + 1}] (${m.category}) ${m.text}`).join("\n");
}

async function deleteMemory(args: ManageMemoryArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to delete a memory";
	const deleted = await prisma.memory.deleteMany({ where: { id: args.id, ownerId } });
	return deleted.count > 0 ? "Memory deleted." : "Memory not found.";
}
