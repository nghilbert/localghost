import { z } from "zod/v4";

const uuid = z.uuid();

/** A chosen model on a specific endpoint. The unit the composer reads and writes. */
export const modelSelectionSchema = z.object({ endpointId: uuid, model: z.string().min(1) });

/**
 * Per-endpoint generation settings mirroring the Ollama SDK `Options` interface.
 * Every field is optional; absent means "use Ollama's own default", so an
 * endpoint needs zero tuning. The Settings UI renders a curated subset.
 */
export const ollamaOptionsSchema = z
	.object({
		num_ctx: z.number().int().positive(),
		num_predict: z.number().int(),
		temperature: z.number().min(0),
		top_k: z.number().int().nonnegative(),
		top_p: z.number().min(0).max(1),
		repeat_penalty: z.number().min(0),
		repeat_last_n: z.number().int(),
		seed: z.number().int(),
		stop: z.array(z.string()),
		mirostat: z.number().int().min(0).max(2),
		mirostat_tau: z.number().min(0),
		mirostat_eta: z.number().min(0),
		presence_penalty: z.number(),
		frequency_penalty: z.number(),
		num_gpu: z.number().int().nonnegative(),
		num_thread: z.number().int().positive(),
		num_batch: z.number().int().positive(),
		num_keep: z.number().int().nonnegative(),
		low_vram: z.boolean(),
		use_mmap: z.boolean(),
		use_mlock: z.boolean(),
		numa: z.boolean(),
	})
	.partial();

export const createEndpointSchema = z.object({
	name: z.string().min(1, "Name is required"),
	url: z.url("Must be a valid URL"),
	apiKey: z.string().optional(),
	provider: z
		.enum(["openai", "anthropic", "ollama", "openrouter", "groq", "gemini"])
		.default("openai"),
	options: ollamaOptionsSchema.optional(),
});

export const updateEndpointSchema = createEndpointSchema.partial();

export const endpointIdInput = z.object({ id: uuid });
export const listEndpointModelsInput = z.object({ endpointId: uuid });
export const modelCapabilitiesInput = z.object({ endpointId: uuid, model: z.string().min(1) });
export const testEndpointInput = z.object({
	url: z.url().max(2048),
	apiKey: z.string().max(4096).optional(),
});
export const updateEndpointInput = z.object({ id: uuid, data: updateEndpointSchema });
