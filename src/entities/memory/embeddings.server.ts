import { trimPathRight } from "@tanstack/react-router";
import { z } from "zod/v4";
import { decrypt } from "#/shared/lib/crypto.server";
import { prisma } from "#/shared/lib/db.server";
import { asLLMProvider, type LLMProvider } from "#/shared/lib/llm.server";

const embeddingResponseSchema = z.object({
	data: z.array(z.object({ embedding: z.array(z.number()) })).optional(),
});

/**
 * The `/v1/embeddings` model per provider family. `null` means the provider has
 * no OpenAI-compatible embeddings endpoint, so `embed` skips it rather than
 * wasting a round trip that would 404.
 */
export function embeddingModelFor(provider: LLMProvider | undefined): string | null {
	switch (provider) {
		case "ollama":
			// A small, widely-pulled local embedding model; not the chat model.
			return "nomic-embed-text";
		case "openai":
		case "openrouter":
		case "groq":
			return "text-embedding-3-small";
		default:
			return null;
	}
}

/**
 * Fetches a text embedding from the user's first endpoint whose provider
 * supports OpenAI-compatible embeddings, in creation order.
 * @returns The vector, or `null` when no endpoint succeeds (callers degrade).
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
		const model = embeddingModelFor(asLLMProvider(ep.provider));
		if (!model) continue;

		const apiKey = ep.apiKeyEncrypted ? decrypt(ep.apiKeyEncrypted) : undefined;
		const base = trimPathRight(ep.url).replace(/\/v1$/, "");
		const embeddingUrl = `${base}/v1/embeddings`;

		try {
			const res = await fetch(embeddingUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
				},
				body: JSON.stringify({ input: text, model }),
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
 * Formats a vector as a pgvector literal (e.g. `[0.1,0.2,...]`) for raw SQL,
 * since Prisma has no native vector type.
 */
export function toVectorLiteral(embedding: number[]): string {
	return `[${embedding.join(",")}]`;
}
