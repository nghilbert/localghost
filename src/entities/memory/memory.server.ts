import { prisma } from "#/shared/lib/db.server";
import { embed, toVectorLiteral } from "./embeddings.server";

export type RecalledMemory = { id: string; text: string; category: string };

/**
 * Persists one memory with its embedding (source `"agent"`). Raw SQL because
 * Prisma has no native pgvector type.
 */
export async function saveMemory({
	ownerId,
	text,
	category,
}: {
	ownerId: string;
	text: string;
	category?: string;
}): Promise<void> {
	const embedding = await embed({ text, ownerId });

	await prisma.$executeRaw`
		INSERT INTO memory (text, category, source, owner_id, embedding)
		VALUES (
			${text},
			${category ?? "fact"},
			'agent',
			${ownerId}::uuid,
			${embedding ? toVectorLiteral(embedding) : null}::vector
		)`;
}

/**
 * Vector-similarity recall (with a keyword fallback when no embedding endpoint
 * is configured) over the user's memories.
 */
export async function recallMemories({
	ownerId,
	query,
	limit = 5,
}: {
	ownerId: string;
	query: string;
	limit?: number;
}): Promise<RecalledMemory[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	const capped = Math.min(limit, 20);
	const embedding = await embed({ text: trimmed, ownerId });

	if (embedding) {
		try {
			// Vector similarity search when embeddings are available.
			return await prisma.$queryRaw<RecalledMemory[]>`
				SELECT id, text, category
				FROM memory
				WHERE owner_id = ${ownerId}::uuid AND embedding IS NOT NULL
				ORDER BY embedding <=> ${toVectorLiteral(embedding)}::vector
				LIMIT ${capped}`;
		} catch {
			// A stored embedding from a different model/dimension makes pgvector's
			// `<=>` throw; degrade to keyword search instead of failing the chat run.
		}
	}
	return keywordRecall({ ownerId, query: trimmed, limit: capped });
}

/** Full-text keyword fallback used when no embedding endpoint is configured or recall fails. */
function keywordRecall({
	ownerId,
	query,
	limit,
}: {
	ownerId: string;
	query: string;
	limit: number;
}): Promise<RecalledMemory[]> {
	return prisma.$queryRaw<RecalledMemory[]>`
		SELECT id, text, category
		FROM memory
		WHERE owner_id = ${ownerId}::uuid AND lower(text) LIKE lower(${`%${query}%`})
		LIMIT ${limit}`;
}

/** The user's memories, newest first, optionally capped. */
export async function findMemories({ ownerId, limit }: { ownerId: string; limit?: number }) {
	return prisma.memory.findMany({
		where: { ownerId },
		orderBy: { id: "desc" },
		...(limit !== undefined ? { take: limit } : {}),
		select: { id: true, text: true, category: true, source: true },
	});
}

/** @returns Whether a memory with that id belonged to the owner and was deleted. */
export async function removeMemory({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<boolean> {
	const deleted = await prisma.memory.deleteMany({ where: { id, ownerId } });
	return deleted.count > 0;
}
