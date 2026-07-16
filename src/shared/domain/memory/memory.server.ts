import type { Prisma } from "#/generated/prisma/client";
import { prisma } from "#/shared/lib/db.server";
import { embed, toVectorLiteral } from "./embeddings.server";

export type RecalledMemory = { id: string; text: string; category: string };

/**
 * Inserts one memory row with a precomputed embedding (raw SQL: Prisma has no
 * pgvector type). Takes the client so callers can batch rows inside a
 * transaction; embed beforehand, external calls don't belong in one.
 */
export async function insertMemory({
	db,
	ownerId,
	text,
	category,
	source,
	embedding,
}: {
	db: Prisma.TransactionClient;
	ownerId: string;
	text: string;
	category?: string;
	source: string;
	embedding: number[] | null;
}): Promise<void> {
	await db.$executeRaw`
		INSERT INTO memory (text, category, source, owner_id, embedding)
		VALUES (
			${text},
			${category ?? "fact"},
			${source},
			${ownerId}::uuid,
			${embedding ? toVectorLiteral(embedding) : null}::vector
		)`;
}

/**
 * Persists one memory with its embedding.
 * A failed embedding stores a NULL vector rather than aborting the write.
 * @param source Provenance; defaults to `"agent"`, overridden on import.
 */
export async function saveMemory({
	ownerId,
	text,
	category,
	source = "agent",
}: {
	ownerId: string;
	text: string;
	category?: string;
	source?: string;
}): Promise<void> {
	const embedding = await embed({ text, ownerId });
	await insertMemory({ db: prisma, ownerId, text, category, source, embedding });
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
		} catch (error) {
			// A stored embedding from a different model/dimension makes pgvector's
			// `<=>` throw; degrade to keyword search instead of failing the chat run.
			console.warn("Vector recall failed; falling back to keyword search", { error });
		}
	}
	return keywordRecall({ ownerId, query: trimmed, limit: capped });
}

/**
 * Keyword fallback used when no embedding endpoint is configured or vector
 * recall fails. Matches memories containing any query word and ranks them by how
 * many distinct words hit, so a multi-word query no longer needs the whole
 * string to appear verbatim.
 */
function keywordRecall({
	ownerId,
	query,
	limit,
}: {
	ownerId: string;
	query: string;
	limit: number;
}): Promise<RecalledMemory[]> {
	const patterns = likePatterns(query);
	return prisma.$queryRaw<RecalledMemory[]>`
		SELECT id, text, category
		FROM memory
		WHERE owner_id = ${ownerId}::uuid AND lower(text) LIKE ANY (${patterns}::text[])
		ORDER BY (
			SELECT count(*)
			FROM unnest(${patterns}::text[]) AS pattern
			WHERE lower(text) LIKE pattern
		) DESC, id DESC
		LIMIT ${limit}`;
}

/**
 * Turns a free-text query into lowercased `%word%` LIKE patterns, one per word,
 * escaping LIKE metacharacters. Words shorter than two chars are dropped; if
 * that leaves nothing, the whole trimmed query is used as a single pattern.
 */
function likePatterns(query: string): string[] {
	const escapeLike = (word: string) => word.replace(/[\\%_]/g, (char) => `\\${char}`);
	const words = query
		.toLowerCase()
		.split(/\s+/)
		.filter((word) => word.length >= 2);
	const tokens = words.length > 0 ? words : [query.trim().toLowerCase()];
	return tokens.map((word) => `%${escapeLike(word)}%`);
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

/**
 * Updates a memory's text and recomputes its embedding (NULL when embedding fails).
 * @returns Whether a memory with that id belonged to the owner and was updated.
 */
export async function patchMemory({
	id,
	ownerId,
	text,
}: {
	id: string;
	ownerId: string;
	text: string;
}): Promise<boolean> {
	const embedding = await embed({ text, ownerId });
	const updated = await prisma.$executeRaw`
		UPDATE memory
		SET text = ${text},
		    embedding = ${embedding ? toVectorLiteral(embedding) : null}::vector
		WHERE id = ${id}::uuid AND owner_id = ${ownerId}::uuid`;
	return updated > 0;
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
