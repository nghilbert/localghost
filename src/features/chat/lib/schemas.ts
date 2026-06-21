import { z } from "zod/v4";

const uuid = z.uuid();

export const createConversationSchema = z.object({
	title: z.string().default("New Chat"),
	endpointId: uuid.optional(),
	model: z.string().default(""),
});

export const updateConversationSchema = z.object({
	title: z.string().min(1).optional(),
	model: z.string().optional(),
	endpointId: uuid.nullish(),
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

/**
 * The `forwardedProps` the chat stream route reads from the AG-UI request body.
 * `conversationId` resolves the row whose model/endpoint config is the server's
 * source of truth; `enabledTools` is the user's ephemeral per-send tool choice
 * (catalog tool ids and `mcp:<serverId>`), never persisted.
 */
export const chatStreamForwardedPropsSchema = z.object({
	conversationId: uuid,
	enabledTools: z.array(z.string()).default([]),
});
