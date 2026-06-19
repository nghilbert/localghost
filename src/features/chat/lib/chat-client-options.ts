import { createChatClientOptions, fetchServerSentEvents } from "@tanstack/ai-client";
import { createChatPersistence } from "#/features/chat/lib/chat-persistence";

/**
 * Shared `useChat` wiring: the SSE connection to the pure stream route and the
 * `Conversation`-backed persistence adapter. Created once and spread into every
 * `useChat` call, which then supplies the per-conversation `id`, `forwardedProps`,
 * and `onFinish`.
 */
export const chatClientOptions = createChatClientOptions({
	connection: fetchServerSentEvents("/api/chat/stream"),
	persistence: createChatPersistence(),
});
