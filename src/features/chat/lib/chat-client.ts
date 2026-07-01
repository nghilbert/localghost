import type { ChatClientPersistence } from "@tanstack/ai-client";
import { createChatClientOptions, fetchServerSentEvents } from "@tanstack/ai-client";
import type { QueryClient } from "@tanstack/react-query";
import {
	conversationQueryOptions,
	deleteConversation,
	saveConversationMessages,
} from "#/features/chat/lib/conversation.functions";

/**
 * The `@tanstack/ai-client` persistence contract backed by the `Conversation`
 * row's `messages` blob, read and written through the app's query cache. The
 * client owns persistence end-to-end: it hydrates from `getItem` and writes the
 * full `UIMessage[]` on every change via `setItem`, so the chat stream route
 * performs no database writes. Route loaders prime the conversation query, so
 * hydration is a cache hit instead of a second fetch.
 */
function createChatPersistence(queryClient: QueryClient): ChatClientPersistence {
	return {
		getItem: async (id) => {
			const conversation = await queryClient.ensureQueryData(conversationQueryOptions(id));
			// `messages` is the stored JSONB blob holding the framework's own
			// `UIMessage[]` shape; round-trip to a plain typed value for the persistor.
			return JSON.parse(JSON.stringify(conversation.messages));
		},
		setItem: async (id, messages) => {
			// Round-trip to plain JSON so the value is a clean, serializable blob for
			// the JSONB column (and assignable to the server fn's validated input).
			const plain = JSON.parse(JSON.stringify(messages));
			await saveConversationMessages({ data: { id, messages: plain } });
			// Mirror the write into the cache so it stays the single source of truth.
			queryClient.setQueryData(conversationQueryOptions(id).queryKey, (prev) =>
				prev ? { ...prev, messages: plain } : prev,
			);
		},
		removeItem: async (id) => {
			await deleteConversation({ data: { id } });
			queryClient.removeQueries({ queryKey: conversationQueryOptions(id).queryKey });
		},
	};
}

/**
 * Shared `useChat` wiring: the SSE connection to the pure stream route and the
 * query-cache-backed persistence adapter. The caller supplies the
 * per-conversation `id` and `forwardedProps`.
 */
export function createChatOptions(queryClient: QueryClient) {
	return createChatClientOptions({
		connection: fetchServerSentEvents("/api/chat/stream"),
		persistence: createChatPersistence(queryClient),
	});
}

/**
 * Read-once handoff of the draft page's ephemeral tool toggles to the freshly
 * created conversation, keyed by conversation id in `sessionStorage`. Only the
 * toggles travel this way — the first message itself is persisted at creation —
 * so losing the handoff merely falls back to default toggles.
 */
export type ChatHandoff = {
	enabledTools: string[];
	forceWebSearch: boolean;
};

const handoffKey = (conversationId: string) => `chat-handoff:${conversationId}`;

export function storeChatHandoff({
	conversationId,
	handoff,
}: {
	conversationId: string;
	handoff: ChatHandoff;
}): void {
	sessionStorage.setItem(handoffKey(conversationId), JSON.stringify(handoff));
}

/** Reads and removes the handoff for a conversation. Null on the server or when absent. */
export function takeChatHandoff(conversationId: string): ChatHandoff | null {
	if (typeof sessionStorage === "undefined") return null;
	const raw = sessionStorage.getItem(handoffKey(conversationId));
	if (!raw) return null;
	sessionStorage.removeItem(handoffKey(conversationId));
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
