import { prisma } from "#/lib/db.server";
import { embed, toVectorLiteral } from "#/lib/embeddings.server";

type MemoryAction = "add" | "search" | "list" | "delete";

type ManageMemoryArgs = {
	action: MemoryAction;
	text?: string;
	query?: string;
	id?: string;
	category?: string;
	limit?: number;
};

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

	await prisma.$executeRawUnsafe(
		`INSERT INTO memory (id, text, category, source, "ownerId", embedding)
         VALUES (gen_random_uuid(), $1, $2, 'agent', $3, $4::vector)`,
		args.text,
		args.category ?? "fact",
		ownerId,
		embedding ? toVectorLiteral(embedding) : null,
	);

	return `Memory saved: "${args.text.slice(0, 80)}${args.text.length > 80 ? "…" : ""}"`;
}

async function searchMemory(args: ManageMemoryArgs, ownerId: string): Promise<string> {
	const query = args.query?.trim();
	if (!query) return "query is required to search memories";

	const limit = Math.min(args.limit ?? 5, 20);
	const embedding = await embed(query, ownerId);

	let rows: Array<{ text: string; category: string; score?: number }> = [];

	if (embedding) {
		// Vector similarity search when embeddings are available
		rows = await prisma.$queryRawUnsafe<typeof rows>(
			`SELECT text, category, 1 - (embedding <=> $1::vector) AS score
             FROM memory WHERE "ownerId" = $2 AND embedding IS NOT NULL
             ORDER BY embedding <=> $1::vector LIMIT $3`,
			toVectorLiteral(embedding),
			ownerId,
			limit,
		);
	} else {
		// Full-text keyword fallback when no embedding endpoint is configured
		rows = await prisma.$queryRawUnsafe<typeof rows>(
			`SELECT text, category FROM memory WHERE "ownerId" = $1
             AND lower(text) LIKE lower($2) LIMIT $3`,
			ownerId,
			`%${query}%`,
			limit,
		);
	}

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
