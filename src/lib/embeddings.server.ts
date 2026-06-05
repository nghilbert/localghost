import { prisma } from "#/lib/db.server";
import { decrypt } from "./crypto.server";

/**
 * Fetch a text embedding from the user's first configured endpoint that
 * supports /v1/embeddings. Falls back to null when no endpoint is available
 * so callers can degrade gracefully (skip vector search, still save memory).
 */
export async function embed(text: string, ownerId: string): Promise<number[] | null> {
	const endpoints = await prisma.modelEndpoint.findMany({
		where: { ownerId },
		orderBy: { createdAt: "asc" },
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

			const json = (await res.json()) as {
				data?: Array<{ embedding: number[] }>;
			};

			const embedding = json.data?.[0]?.embedding;
			if (Array.isArray(embedding) && embedding.length > 0) {
				return embedding;
			}
		} catch {
			// Try next endpoint
		}
	}

	return null;
}

/**
 * Format a number[] as a pgvector literal string, e.g. "[0.1,0.2,...]".
 * Used in raw SQL queries since Prisma doesn't have native vector support.
 */
export function toVectorLiteral(embedding: number[]): string {
	return `[${embedding.join(",")}]`;
}
