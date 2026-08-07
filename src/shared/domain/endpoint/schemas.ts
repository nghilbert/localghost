import { z } from "zod/v4";
import { llmProviderSchema } from "#/shared/lib/llm-provider";

const uuid = z.uuid();

/** A chosen model on a specific endpoint. The unit the composer reads and writes. */
export const modelSelectionSchema = z.object({ endpointId: uuid, model: z.string().min(1) });

/** Per-endpoint generation settings sent with chat requests.
 * All fields are optional; load-time llama.cpp flags stay out of this schema.
 */
export const samplingOptionsSchema = z
	.object({
		temperature: z.number().min(0),
		top_p: z.number().min(0).max(1),
		top_k: z.number().int().nonnegative(),
		min_p: z.number().min(0).max(1),
		repeat_penalty: z.number().min(0),
		presence_penalty: z.number(),
		frequency_penalty: z.number(),
		seed: z.number().int(),
		stop: z.array(z.string()),
		max_tokens: z.number().int(),
		mirostat: z.number().int().min(0).max(2),
		mirostat_tau: z.number().min(0),
		mirostat_eta: z.number().min(0),
	})
	.partial();

export const createEndpointSchema = z.object({
	name: z.string().min(1, "Name is required"),
	url: z.url("Must be a valid URL"),
	apiKey: z.string().optional(),
	provider: llmProviderSchema.default("openai"),
	options: samplingOptionsSchema.optional(),
});

export const updateEndpointSchema = createEndpointSchema.partial();

export const endpointIdInput = z.object({ id: uuid });
export const listEndpointModelsInput = z.object({ endpointId: uuid });
export const modelCapabilitiesInput = z.object({ endpointId: uuid, model: z.string().min(1) });
export const testEndpointInput = z.object({
	url: z.url().max(2048),
	apiKey: z.string().max(4096).optional(),
	/** The provider the user picked; absent falls back to URL sniffing. */
	provider: llmProviderSchema.optional(),
});
export const updateEndpointInput = z.object({ id: uuid, data: updateEndpointSchema });
