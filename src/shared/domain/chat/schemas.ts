import { z } from "zod/v4";

const uuid = z.uuid();

/**
 * The `forwardedProps` the chat stream route reads from the request body: the
 * ephemeral per-send tool choices (never persisted) and the user's IANA timezone.
 * The conversation is identified by the run's own `threadId`, never by a second
 * id here, so there is only one value for the route to authorize.
 */
export const chatStreamForwardedPropsSchema = z.object({
	enabledTools: z.array(z.string()).default([]),
	timeZone: z.string().max(64).optional(),
});

/** The chat stream's run identity: the conversation id doubles as the AG-UI thread id. */
export const chatThreadIdSchema = uuid;

/** A run id as `chat()` mints it: opaque, non-empty, no control characters. */
export const chatRunIdSchema = z.string().min(1).max(200);
