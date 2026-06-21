import { z } from "zod/v4";

const uuid = z.uuid();

export const createEndpointSchema = z.object({
	name: z.string().min(1, "Name is required"),
	url: z.url("Must be a valid URL"),
	apiKey: z.string().optional(),
	provider: z
		.enum(["openai", "anthropic", "ollama", "openrouter", "groq", "gemini"])
		.default("openai"),
});

export const updateEndpointSchema = createEndpointSchema.partial();

export const endpointIdInput = z.object({ id: uuid });
export const getEndpointModelsInput = z.object({ endpointId: uuid });
export const modelCapabilitiesInput = z.object({ endpointId: uuid, model: z.string().min(1) });
export const testEndpointInput = z.object({
	url: z.url().max(2048),
	apiKey: z.string().max(4096).optional(),
});
export const updateEndpointInput = z.object({ id: uuid, data: updateEndpointSchema });
