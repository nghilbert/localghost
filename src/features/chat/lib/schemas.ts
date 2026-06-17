import { z } from "zod/v4";

const uuid = z.uuid();

/**
 * One persisted `@tanstack/ai` UIMessage. `parts` is validated as opaque JSON so
 * the framework's full part shape (text, thinking, tool-call, tool-result) round-
 * trips through the `messages` JSONB column untouched.
 */
export const storedMessageSchema = z.object({
	id: z.string(),
	role: z.enum(["system", "user", "assistant"]),
	parts: z.array(z.json()),
});

export const createConversationSchema = z.object({
	title: z.string().default("New Chat"),
	endpointId: uuid.optional(),
	model: z.string().default(""),
	mode: z.enum(["chat", "agent"]).default("chat"),
});

export const updateConversationSchema = z.object({
	title: z.string().min(1).optional(),
	model: z.string().optional(),
	endpointId: uuid.nullish(),
	mode: z.enum(["chat", "agent"]).optional(),
	systemPrompt: z.string().nullish(),
	temperature: z.number().min(0).max(2).nullish(),
	archived: z.boolean().optional(),
});

// ── Server-fn inputs ─────────────────────────────────────────────────────────

export const conversationIdInput = z.object({ id: uuid });
export const updateConversationInput = z.object({ id: uuid, data: updateConversationSchema });
export const saveMessagesInput = z.object({ id: uuid, messages: z.array(storedMessageSchema) });
export const searchConversationsInput = z.object({ query: z.string().min(1).max(200) });
export const renameConversationInput = z.object({
	id: uuid,
	userText: z.string().max(2000).default(""),
	assistantText: z.string().max(2000).default(""),
});

/**
 * The `forwardedProps` the chat stream route reads from the AG-UI request body.
 * Only the conversation id is forwarded; all model/endpoint config is the
 * server's source of truth, read from the conversation row.
 */
export const chatStreamForwardedPropsSchema = z.object({ conversationId: uuid });
