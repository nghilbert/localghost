import { z } from "zod";
import { llmProviderSchema } from "#/lib/llm-provider";
import { samplingOptionsSchema } from "#/lib/llm-schemas";

const uuid = z.uuid();

/** A new endpoint. */
export const createEndpointSchema = z.object({
	name: z.string().min(1, "Name is required"),
	url: z.url("Must be a valid URL"),
	apiKey: z.string().optional(),
	provider: llmProviderSchema.default("openai"),
	options: samplingOptionsSchema.optional(),
});

/** The endpoint fields to change. */
export const updateEndpointSchema = createEndpointSchema.partial();

/** Identifies an endpoint. */
export const endpointIdInput = z.object({ id: uuid });

/** Identifies an endpoint whose models to list. */
export const listEndpointModelsInput = z.object({ endpointId: uuid });

/** An unsaved endpoint to test. */
export const testEndpointInput = z.object({
	url: z.url().max(2048),
	apiKey: z.string().max(4096).optional(),
	/** Detected from the URL when absent. */
	provider: llmProviderSchema.optional(),
});

/** An endpoint id and the fields to change. */
export const updateEndpointInput = z.object({ id: uuid, data: updateEndpointSchema });
