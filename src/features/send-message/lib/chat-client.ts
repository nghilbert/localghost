import type { ChatClientPersistence, UIMessage } from "@tanstack/ai-client";
import { createChatClientOptions, fetchServerSentEvents } from "@tanstack/ai-client";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	conversationQueryOptions,
	deleteConversation,
	saveConversationMessages,
} from "#/entities/conversation/conversation.functions";

/** Delay between a message change and its persistence write; each burst saves once. */
const SAVE_DEBOUNCE_MS = 500;

/** Deep-copies so live chat state and the query cache never share objects. */
function clone<T>(value: T): T {
	return structuredClone(value);
}

type PendingSave = {
	timer: ReturnType<typeof setTimeout>;
	snapshot: UIMessage[];
	queryClient: QueryClient;
};

// Module-level (not per-persistence-instance) so the flush listeners below are
// registered exactly once, even though `ChatView` remounts a fresh persistence
// object on every conversation switch.
const pending = new Map<string, PendingSave>();

function commit(id: string) {
	const entry = pending.get(id);
	if (!entry) return;
	pending.delete(id);
	const { snapshot, queryClient } = entry;
	saveConversationMessages({ data: { id, messages: snapshot } })
		.then(() => {
			queryClient.setQueryData(conversationQueryOptions(id).queryKey, (prev) =>
				prev ? { ...prev, messages: snapshot } : prev,
			);
		})
		.catch(() => toast.error("Failed to save the conversation"));
}

function flushAll() {
	for (const [id, { timer }] of pending) {
		clearTimeout(timer);
		commit(id);
	}
}

if (typeof document !== "undefined") {
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") flushAll();
	});
	window.addEventListener("pagehide", flushAll);
}

/**
 * {@link ChatClientPersistence} backed by the conversation query cache: `getItem`
 * answers synchronously from the loader-primed cache, and `setItem` debounces
 * into one save per burst, flushed immediately on tab hide/close.
 */
function createChatPersistence(queryClient: QueryClient): ChatClientPersistence {
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
			clearTimeout(pending.get(id)?.timer);
			const timer = setTimeout(() => commit(id), SAVE_DEBOUNCE_MS);
			pending.set(id, { timer, snapshot, queryClient });
		},
		removeItem: async (id) => {
			clearTimeout(pending.get(id)?.timer);
			pending.delete(id);
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
