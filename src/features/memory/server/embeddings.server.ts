import { createModel, embed as embedWith, extendAdapter } from "@tanstack/ai";
import { createOpenaiEmbedding } from "@tanstack/ai-openai";
import { trimPathRight } from "@tanstack/react-router";
import { endpointApiKey } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { MS_PER_SECOND } from "#/lib/format";
import { chatBaseUrl, providerApiKey } from "#/lib/llm.server";
import { asLLMProvider, type LLMProvider } from "#/lib/llm-provider";

/** The embedding model a provider family serves, and the OpenAI-compatible base URL to call it at. */
type EmbeddingConfig = {
	model: string;
	baseUrl: (url: string) => string;
};

/** The embedding config for a provider, or `null` when it has no embeddings API (Anthropic). */
export function embeddingConfigFor(provider: LLMProvider | undefined): EmbeddingConfig | null {
	switch (provider) {
		case "llamacpp":
			// A small embedding model the router downloads on first use.
			return {
				model: "ggml-org/embeddinggemma-300M-GGUF:Q8_0",
				baseUrl: (url) => chatBaseUrl({ url, provider }),
			};
		case "openai":
		case "openrouter":
		case "groq":
			return {
				model: "text-embedding-3-small",
				baseUrl: (url) => chatBaseUrl({ url, provider }),
			};
		case "gemini":
			// Gemini's OpenAI-compatible API lives under `/v1beta/openai`.
			return {
				model: "text-embedding-004",
				baseUrl: (url) => `${trimPathRight(url).replace(/\/v1beta$/, "")}/v1beta/openai`,
			};
		default:
			return null;
	}
}

/**
 * Embeds `text` with the user's first endpoint that supports embeddings.
 * @returns The vector, or `null` when no endpoint succeeds.
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
		const provider = asLLMProvider(ep.provider);
		const config = provider ? embeddingConfigFor(provider) : null;
		if (!provider || !config) continue;

		let apiKey: string | undefined;
		try {
			apiKey = providerApiKey({ provider, apiKey: endpointApiKey(ep) });
		} catch {
			continue;
		}

		// `createOpenaiEmbedding` only types OpenAI's models; register this one so any name is accepted.
		const createAdapter = extendAdapter(createOpenaiEmbedding, [
			createModel(config.model, ["text"]),
		]);
		const adapter = createAdapter(config.model, apiKey ?? "", {
			baseURL: config.baseUrl(ep.url),
			timeout: 10 * MS_PER_SECOND,
			// A failing endpoint falls through to the next one instead of retrying.
			maxRetries: 0,
		});
		try {
			const result = await embedWith({ adapter, input: text });
			const vector = result.embeddings[0]?.vector;
			if (vector && vector.length > 0) return vector;
		} catch (error) {
			console.warn("Embedding request failed; trying the next endpoint", {
				url: ep.url,
				model: config.model,
				error,
			});
		}
	}

	return null;
}

/** Formats a vector as a pgvector literal (`[0.1,0.2,...]`) for raw SQL. */
export function toVectorLiteral(embedding: number[]): string {
	return `[${embedding.join(",")}]`;
}
