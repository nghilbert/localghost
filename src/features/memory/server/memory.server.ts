import type { Prisma } from "#/generated/prisma/client";
import { prisma } from "#/lib/db.server";
import { embed, toVectorLiteral } from "./embeddings.server";

/** A memory returned by {@link recallMemories}. */
type RecalledMemory = { id: string; text: string; category: string };

/**
 * Inserts a memory with a precomputed embedding, using raw SQL since Prisma has no
 * vector type. Takes `db` so it can run inside a transaction.
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

/** Whether {@link saveMemory} stored a new row or found the fact already remembered. */
type SaveMemoryResult = { status: "saved" } | { status: "duplicate"; text: string };

/** Maximum cosine distance for treating two memory embeddings as duplicates. */
const DEDUP_MAX_COSINE_DISTANCE = 0.08;

/**
 * Saves a memory unless an equal or nearly identical one exists. A failed embedding
 * stores a NULL vector.
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
}): Promise<SaveMemoryResult> {
	const embedding = await embed({ text, ownerId });

	// Serializable, so two concurrent saves of the same fact can't both insert.
	return prisma.$transaction(
		async (tx) => {
			const exact = await tx.memory.findFirst({
				where: { ownerId, text, category: category ?? "fact" },
				select: { text: true },
			});
			if (exact) return { status: "duplicate", text: exact.text };

			if (embedding) {
				const nearest = await nearestMemory({ db: tx, ownerId, embedding });
				if (nearest && nearest.distance < DEDUP_MAX_COSINE_DISTANCE) {
					return { status: "duplicate", text: nearest.text };
				}
			}

			await insertMemory({ db: tx, ownerId, text, category, source, embedding });
			return { status: "saved" };
		},
		{ isolationLevel: "Serializable" },
	);
}

/**
 * The user's memory closest to `embedding`, or null when none has the same dimension.
 */
async function nearestMemory({
	db = prisma,
	ownerId,
	embedding,
}: {
	db?: Prisma.TransactionClient;
	ownerId: string;
	embedding: number[];
}): Promise<{ text: string; distance: number } | null> {
	// `<=>` throws on a dimension mismatch, which would abort the caller's transaction,
	// so rows from another embedding model are filtered out first.
	const rows = await db.$queryRaw<Array<{ text: string; distance: number }>>`
		SELECT text, embedding <=> ${toVectorLiteral(embedding)}::vector AS distance
		FROM memory
		WHERE owner_id = ${ownerId}::uuid
			AND embedding IS NOT NULL
			AND vector_dims(embedding) = ${embedding.length}
		ORDER BY embedding <=> ${toVectorLiteral(embedding)}::vector
		LIMIT 1`;
	return rows[0] ?? null;
}

/** The memories most similar to `query`, falling back to keyword search without embeddings. */
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
			return await prisma.$queryRaw<RecalledMemory[]>`
				SELECT id, text, category
				FROM memory
				WHERE owner_id = ${ownerId}::uuid AND embedding IS NOT NULL
				ORDER BY embedding <=> ${toVectorLiteral(embedding)}::vector
				LIMIT ${capped}`;
		} catch (error) {
			// Embeddings from a different model have another dimension, which makes `<=>` throw.
			console.warn("Vector recall failed; falling back to keyword search", { error });
		}
	}
	return keywordRecall({ ownerId, query: trimmed, limit: capped });
}

/** Ranks memories by how many of the query's words they contain. */
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
 * One escaped `%word%` LIKE pattern per word of two or more characters, or the whole
 * query when no word is that long.
 */
function likePatterns(query: string): string[] {
	const words = query
		.toLowerCase()
		.split(/\s+/)
		.filter((word) => word.length >= 2);
	const tokens = words.length > 0 ? words : [query.trim().toLowerCase()];
	return tokens.map((word) => `%${word.replace(/[\\%_]/g, "\\$&")}%`);
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
 * Updates a memory's text and embedding.
 * @returns Whether the user owned the memory.
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

/**
 * Deletes a memory.
 * @returns Whether the user owned the memory.
 */
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
