import { z } from "zod/v4";
import { ollamaOptionsSchema } from "#/shared/domain/endpoint/schemas";

/**
 * The per-model generation overrides a user can tune, a curated subset of
 * {@link ollamaOptionsSchema} shared with the per-endpoint scope so the two
 * layers merge cleanly.
 */
export const perModelOptionsSchema = ollamaOptionsSchema.pick({
	num_ctx: true,
	temperature: true,
	top_p: true,
	top_k: true,
	repeat_penalty: true,
	num_predict: true,
});

const uuid = z.uuid();

export const modelSettingInput = z.object({ endpointId: uuid, model: z.string().min(1) });
export const upsertModelSettingInput = z.object({
	endpointId: uuid,
	model: z.string().min(1),
	options: perModelOptionsSchema,
});
