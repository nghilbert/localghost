import { fetchServerSentEvents } from "@tanstack/ai-client";

/**
 * `reconstructChat` serializes `createdAt` to an ISO string and the client's
 * hydration stores it back unrevived, so the next send throws inside
 * `uiMessagesToWire`. Revive it on the adapter's own hydrate seam.
 */
export function createAgentConnection() {
	const connection = fetchServerSentEvents("/api/agent/stream");
	const { hydrate } = connection;
	if (!hydrate) return connection;
	return {
		...connection,
		hydrate: async (threadId: string) => {
			const result = await hydrate(threadId);
			return {
				...result,
				messages: result.messages.map((message) =>
					message.createdAt ? { ...message, createdAt: new Date(message.createdAt) } : message,
				),
			};
		},
	};
}
