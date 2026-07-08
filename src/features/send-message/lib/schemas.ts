import { z } from "zod/v4";

const uuid = z.uuid();

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
