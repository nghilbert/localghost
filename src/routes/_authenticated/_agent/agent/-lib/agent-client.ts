import { fetchServerSentEvents } from "@tanstack/ai-client";

/** The SSE connection to the code-agent stream route; the server owns persistence. */
export function createAgentConnection() {
	return fetchServerSentEvents("/api/agent/stream");
}
