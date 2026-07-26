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

/** Whether {@link saveMemory} stored a new row or found the fact already remembered. */
export type SaveMemoryResult = { status: "saved" } | { status: "duplicate"; text: string };

/** Maximum cosine distance for treating two memory embeddings as duplicates. */
const DEDUP_MAX_COSINE_DISTANCE = 0.08;

/** Persists a memory and its embedding, skipping an existing equivalent fact.
 * A failed embedding stores a NULL vector instead of aborting the write.
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

	// Serializable so two concurrent saves of the same fact can't both pass the
	// dedup check and both insert; the loser's transaction fails and retries as
	// a plain duplicate result on the caller's next attempt.
	return prisma.$transaction(
		async (tx) => {
			// Cheap exact match first (mirrors the backup importer's dedup key).
			const exact = await tx.memory.findFirst({
				where: { ownerId, text, category: category ?? "fact" },
				select: { text: true },
			});
			if (exact) return { status: "duplicate", text: exact.text };

			// Then a semantic near-duplicate check, reusing the embedding we just computed.
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
 * The user's memory closest to `embedding` by cosine distance, or null when they
 * have none embedded. Degrades to null (rather than throwing) when a stored
 * vector's dimension mismatches, same as {@link recallMemories}.
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
	try {
		const rows = await db.$queryRaw<Array<{ text: string; distance: number }>>`
			SELECT text, embedding <=> ${toVectorLiteral(embedding)}::vector AS distance
			FROM memory
			WHERE owner_id = ${ownerId}::uuid AND embedding IS NOT NULL
			ORDER BY embedding <=> ${toVectorLiteral(embedding)}::vector
			LIMIT 1`;
		return rows[0] ?? null;
	} catch (error) {
		console.warn("Nearest-memory lookup failed; skipping semantic dedup", { error });
		return null;
	}
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

/** Keyword fallback when embedding recall is unavailable or fails.
 * Ranks memories by the number of distinct query words they contain.
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
const LIKE_METACHARACTERS = ["\\", "%", "_"];

function escapeLike(word: string): string {
	let escaped = word;
	for (const char of LIKE_METACHARACTERS) {
		escaped = escaped.split(char).join(`\\${char}`);
	}
	return escaped;
}

/** Splits on runs of whitespace, dropping empty tokens (a plain-string `/\s+/`). */
function splitOnWhitespace(text: string): string[] {
	const tokens: string[] = [];
	let current = "";
	for (const char of text) {
		if (char.trim() === "") {
			if (current) {
				tokens.push(current);
				current = "";
			}
		} else {
			current += char;
		}
	}
	if (current) tokens.push(current);
	return tokens;
}

function likePatterns(query: string): string[] {
	const words = splitOnWhitespace(query.toLowerCase()).filter((word) => word.length >= 2);
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
