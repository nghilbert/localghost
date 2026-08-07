import { trimPathRight } from "@tanstack/react-router";
import { z } from "zod/v4";
import { endpointApiKey } from "#/shared/domain/endpoint/endpoint.server";
import { prisma } from "#/shared/lib/db.server";
import { asLLMProvider, type LLMProvider } from "#/shared/lib/llm-provider";

const embeddingResponseSchema = z.object({
	data: z.array(z.object({ embedding: z.array(z.number()) })).optional(),
});

/** How to embed one text against a provider family; mirrors `PROVIDERS` in llm.server.ts. */
type EmbeddingConfig = {
	model: string;
	buildRequest: (params: { url: string; apiKey?: string; text: string }) => {
		url: string;
		headers: Record<string, string>;
		body: string;
	};
	parse: (json: unknown) => number[] | undefined;
};

/** Reads the first embedding out of an OpenAI-shaped `{ data: [{ embedding }] }` response. */
function parseOpenAIEmbedding(json: unknown): number[] | undefined {
	const parsed = embeddingResponseSchema.safeParse(json);
	if (!parsed.success) return undefined;
	const embedding = parsed.data.data?.[0]?.embedding;
	return embedding && embedding.length > 0 ? embedding : undefined;
}

/** Builds an OpenAI-compatible embedding config.
 * `stripSuffix` avoids duplicating a path suffix already present in the endpoint URL.
 */
function openAICompatibleEmbedding({
	model,
	path,
	stripSuffix,
}: {
	model: string;
	path: string;
	stripSuffix: RegExp;
}): EmbeddingConfig {
	return {
		model,
		buildRequest: ({ url, apiKey, text }) => {
			const base = trimPathRight(url).replace(stripSuffix, "");
			return {
				url: `${base}${path}`,
				headers: {
					"Content-Type": "application/json",
					...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
				},
				body: JSON.stringify({ input: text, model }),
			};
		},
		parse: parseOpenAIEmbedding,
	};
}

/**
 * The embedding config per provider family, or `null` when the provider has no
 * embeddings endpoint (Anthropic, and unrecognized providers) so `embed` skips
 * it rather than wasting a round trip that would 404.
 */
export function embeddingConfigFor(provider: LLMProvider | undefined): EmbeddingConfig | null {
	switch (provider) {
		case "llamacpp":
			// A small embedding GGUF; the router auto-downloads it on first use,
			// same as any other model. Not the chat model.
			return openAICompatibleEmbedding({
				model: "ggml-org/embeddinggemma-300M-GGUF:Q8_0",
				path: "/v1/embeddings",
				stripSuffix: /\/v1$/,
			});
		case "openai":
		case "openrouter":
		case "groq":
			return openAICompatibleEmbedding({
				model: "text-embedding-3-small",
				path: "/v1/embeddings",
				stripSuffix: /\/v1$/,
			});
		case "gemini":
			// Gemini has no OpenAI `/v1/embeddings`, but its `/v1beta/openai` surface
			// speaks the same wire shape, so only the path and model differ.
			return openAICompatibleEmbedding({
				model: "text-embedding-004",
				path: "/v1beta/openai/embeddings",
				stripSuffix: /\/v1beta$/,
			});
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
	const endpoints = await prisma.endpoint.findMany({
		where: { ownerId },
		orderBy: { id: "asc" },
	});

	for (const ep of endpoints) {
		const config = embeddingConfigFor(asLLMProvider(ep.provider));
		if (!config) continue;

		let apiKey: string | undefined;
		try {
			apiKey = endpointApiKey(ep);
		} catch {
			// endpointApiKey already logged the decrypt failure; try the next endpoint.
			continue;
		}
		const request = config.buildRequest({ url: ep.url, apiKey, text });

		try {
			const res = await fetch(request.url, {
				method: "POST",
				headers: request.headers,
				body: request.body,
				signal: AbortSignal.timeout(10_000),
			});

			if (!res.ok) {
				console.warn("Embedding request rejected; trying the next endpoint", {
					url: request.url,
					model: config.model,
					status: res.status,
				});
				continue;
			}

			const embedding = config.parse(await res.json());
			if (embedding) return embedding;
		} catch (error) {
			console.warn("Embedding request failed; trying the next endpoint", {
				url: request.url,
				model: config.model,
				error,
			});
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
