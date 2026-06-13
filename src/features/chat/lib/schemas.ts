import { z } from "zod/v4";

const uuid = z.uuid();

export const createEndpointSchema = z.object({
	name: z.string().min(1, "Name is required"),
	url: z.string().url("Must be a valid URL"),
	apiKey: z.string().optional(),
	provider: z.enum(["openai", "anthropic", "ollama", "openrouter", "groq"]).default("openai"),
});

export const updateEndpointSchema = createEndpointSchema.partial();

export const createSessionSchema = z.object({
	name: z.string().default("New Chat"),
	endpointId: uuid.optional(),
	model: z.string().default(""),
	mode: z.enum(["chat", "agent"]).default("chat"),
});

export const updateSessionSchema = z.object({
	name: z.string().min(1).optional(),
	model: z.string().optional(),
	endpointId: uuid.optional(),
	mode: z.enum(["chat", "agent"]).optional(),
	systemPrompt: z.string().nullish(),
	temperature: z.number().min(0).max(2).nullish(),
	ragEnabled: z.boolean().optional(),
	archived: z.boolean().optional(),
});

export const chatMessageSchema = z.object({
	sessionId: uuid,
	message: z.string().min(1),
});

// ── Presets ─────────────────────────────────────────────────────────────────

export const CreatePresetFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	description: z.string(),
	systemPrompt: z.string().trim().min(1, "System prompt is required"),
});

export const createPresetDefaults: z.infer<typeof CreatePresetFormSchema> = {
	name: "",
	description: "",
	systemPrompt: "",
};

export const SavePresetNameFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(100),
});

export const savePresetNameDefaults: z.infer<typeof SavePresetNameFormSchema> = { name: "" };

export const createPresetInput = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(300).optional(),
	systemPrompt: z.string().min(1).max(10000),
	model: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	mode: z.string().optional(),
});

export const updatePresetInput = z.object({
	id: uuid,
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(300).optional(),
	systemPrompt: z.string().min(1).max(10000).optional(),
	model: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
});

export const deletePresetInput = z.object({ id: uuid });

export const toCreatePresetInput = (
	value: z.infer<typeof CreatePresetFormSchema>,
): z.input<typeof createPresetInput> => ({
	name: value.name.trim(),
	description: value.description.trim() || undefined,
	systemPrompt: value.systemPrompt.trim(),
});
