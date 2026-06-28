import { z } from "zod/v4";

const uuid = z.uuid();

export const createConversationSchema = z.object({
	title: z.string().default("New Chat"),
	endpointId: uuid,
	model: z.string().min(1),
});

export const updateConversationSchema = z.object({
	title: z.string().min(1).optional(),
	selection: z.object({ endpointId: uuid, model: z.string().min(1) }).optional(),
	archived: z.boolean().optional(),
});

// ── Server-fn inputs ─────────────────────────────────────────────────────────

export const conversationIdInput = z.object({ id: uuid });
export const updateConversationInput = z.object({ id: uuid, data: updateConversationSchema });
export const saveMessagesInput = z.object({
	id: uuid,
	messages: z.array(z.record(z.string(), z.unknown())),
});

/**
 * The `forwardedProps` the chat stream route reads from the AG-UI request body.
 * `conversationId` resolves the row whose model/endpoint config is the server's
 * source of truth; `enabledTools` is the user's ephemeral per-send tool choice
 * (tool ids), never persisted; `forceWebSearch` tells the model to run a web
 * search this turn rather than leaving it to infer.
 */
export const chatStreamForwardedPropsSchema = z.object({
	conversationId: uuid,
	enabledTools: z.array(z.string()).default([]),
	forceWebSearch: z.boolean().default(false),
});
