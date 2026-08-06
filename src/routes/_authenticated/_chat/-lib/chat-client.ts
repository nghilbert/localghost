import { fetchServerSentEvents } from "@tanstack/ai-client";

/** The SSE connection to the chat stream route; the server owns persistence. */
export function createChatConnection() {
	return fetchServerSentEvents("/api/chat/stream");
}
