import { z } from "zod/v4";

const uuid = z.uuid();

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
export const saveMessagesInput = z.object({
	id: uuid,
	messages: z.array(z.record(z.string(), z.unknown())),
});
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
