import { z } from "zod/v4";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";

const embeddingResponseSchema = z.object({
	data: z.array(z.object({ embedding: z.array(z.number()) })).optional(),
});

/**
 * Fetches a text embedding from the user's first endpoint that supports
 * `/v1/embeddings`, trying each endpoint in creation order.
 *
 * @param text - The text to embed.
 * @param ownerId - The user whose configured endpoints are tried.
 * @returns The embedding vector, or `null` if no endpoint succeeds so callers can
 *   degrade gracefully (skip vector search, still save the record).
 */
export async function embed({
	text,
	ownerId,
}: {
	text: string;
	ownerId: string;
}): Promise<number[] | null> {
	const endpoints = await prisma.modelEndpoint.findMany({
		where: { ownerId },
		orderBy: { id: "asc" },
	});

	for (const ep of endpoints) {
		const apiKey = ep.apiKeyEncrypted ? decrypt(ep.apiKeyEncrypted) : undefined;
		const base = ep.url.replace(/\/$/, "").replace(/\/v1\/?$/, "");
		const embeddingUrl = `${base}/v1/embeddings`;

		try {
			const res = await fetch(embeddingUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
				},
				body: JSON.stringify({ input: text, model: "text-embedding-3-small" }),
				signal: AbortSignal.timeout(10_000),
			});

			if (!res.ok) continue;

			const parsed = embeddingResponseSchema.safeParse(await res.json());
			if (!parsed.success) continue;

			const embedding = parsed.data.data?.[0]?.embedding;
			if (embedding && embedding.length > 0) {
				return embedding;
			}
		} catch {
			// Try next endpoint
		}
	}

	return null;
}

/**
 * Formats a vector as a pgvector literal (e.g. `[0.1,0.2,...]`) for use in raw SQL,
 * since Prisma has no native vector type.
 *
 * @param embedding - The embedding vector.
 * @returns The pgvector literal string.
 */
export function toVectorLiteral(embedding: number[]): string {
	return `[${embedding.join(",")}]`;
}
