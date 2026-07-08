import { z } from "zod/v4";
import { modelSelectionSchema } from "#/features/endpoints/lib/schemas";

const uuid = z.uuid();

export const updateConversationSchema = z.object({
	title: z.string().min(1).optional(),
});

// ── Server-fn inputs ─────────────────────────────────────────────────────────

export const conversationIdInput = z.object({ id: uuid });
export const createConversationInput = z.object({
	selection: modelSelectionSchema,
	firstMessage: z.string().min(1),
});
export const updateConversationInput = z.object({ id: uuid, data: updateConversationSchema });
// `messages` carries UIMessage[], whose interface type can't satisfy a zod record;
// the blob is stored opaquely, so unknown entries are fine here.
export const saveMessagesInput = z.object({ id: uuid, messages: z.array(z.unknown()) });

/**
 * The `forwardedProps` the chat stream route reads from the request body:
 * the conversation whose row holds the model config, the ephemeral per-send
 * tool choices (never persisted), and the user's IANA timezone.
 */
export const chatStreamForwardedPropsSchema = z.object({
	conversationId: uuid,
	enabledTools: z.array(z.string()).default([]),
	timeZone: z.string().max(64).optional(),
});
