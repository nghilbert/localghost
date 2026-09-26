import { z } from "zod";

/** A model on a specific endpoint. */
export const modelSelectionSchema = z.object({ endpointId: z.uuid(), model: z.string().min(1) });

/** A model on a specific endpoint. */
export type ModelSelection = z.infer<typeof modelSelectionSchema>;

/** Sampling settings sent with chat requests, stored per endpoint and per model. All optional. */
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
