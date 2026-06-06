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
	archived: z.boolean().optional(),
});

export const chatMessageSchema = z.object({
	sessionId: uuid,
	message: z.string().min(1),
});
