import { http, HttpResponse } from "msw";
import type { CreateEmbeddingResponse } from "openai/resources";
import { z } from "zod";

const embeddingRequestSchema = z.object({ input: z.union([z.string(), z.array(z.string())]) });

/**
 * An OpenAI-compatible `POST <base>/embeddings` route for `network.use(...)`. It answers every
 * input with `vectorFor(input)`. `base` defaults to any origin and path.
 */
export function embeddingsApi({
	vectorFor,
	base = "*",
}: {
	vectorFor: (input: string) => number[];
	base?: string;
}) {
	return http.post(`${base}/embeddings`, async ({ request }) => {
		const { input } = embeddingRequestSchema.parse(await request.json());
		const inputs = typeof input === "string" ? [input] : input;
		return HttpResponse.json({
			object: "list",
			data: inputs.map((text, index) => ({
				object: "embedding",
				index,
				embedding: vectorFor(text),
			})),
			model: "test-embedding",
			usage: { prompt_tokens: inputs.length, total_tokens: inputs.length },
		} satisfies CreateEmbeddingResponse);
	});
}
