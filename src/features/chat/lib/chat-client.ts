import type { ChatClientPersistence } from "@tanstack/ai-client";
import { createChatClientOptions, fetchServerSentEvents } from "@tanstack/ai-client";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	conversationQueryOptions,
	deleteConversation,
	saveConversationMessages,
} from "#/features/chat/lib/conversation.functions";

/** Delay between a message change and its persistence write; each burst saves once. */
const SAVE_DEBOUNCE_MS = 500;

/** Deep-copies through JSON so live chat state and the query cache never share objects. */
function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

/**
 * {@link ChatClientPersistence} backed by the conversation query cache: `getItem`
 * answers synchronously from the loader-primed cache (no hydration race), and the
 * per-delta `setItem` calls debounce into one save per burst.
 */
function createChatPersistence(queryClient: QueryClient): ChatClientPersistence {
	const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

	return {
		getItem: (id) => {
			const cached = queryClient.getQueryData(conversationQueryOptions(id).queryKey);
			if (cached) return clone(cached.messages);
			return queryClient
				.ensureQueryData(conversationQueryOptions(id))
				.then((conversation) => clone(conversation.messages));
		},
		setItem: (id, messages) => {
			const snapshot = clone(messages);
			clearTimeout(saveTimers.get(id));
			saveTimers.set(
				id,
				setTimeout(() => {
					saveTimers.delete(id);
					saveConversationMessages({ data: { id, messages: snapshot } }).catch(() =>
						toast.error("Failed to save the conversation"),
					);
					queryClient.setQueryData(conversationQueryOptions(id).queryKey, (prev) =>
						prev ? { ...prev, messages: snapshot } : prev,
					);
				}, SAVE_DEBOUNCE_MS),
			);
		},
		removeItem: async (id) => {
			clearTimeout(saveTimers.get(id));
			saveTimers.delete(id);
			await deleteConversation({ data: { id } });
			queryClient.removeQueries({ queryKey: conversationQueryOptions(id).queryKey });
		},
	};
}

/** Shared `useChat` options: SSE connection to the stream route plus cache-backed persistence. */
export function createChatOptions(queryClient: QueryClient) {
	return createChatClientOptions({
		connection: fetchServerSentEvents("/api/chat/stream"),
		persistence: createChatPersistence(queryClient),
	});
}
