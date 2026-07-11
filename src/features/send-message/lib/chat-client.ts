import type { ChatClientPersistence, UIMessage } from "@tanstack/ai-client";
import { createChatClientOptions, fetchServerSentEvents } from "@tanstack/ai-client";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	conversationQueryOptions,
	conversationsQueryOptions,
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
	/** Monotonic per-id order of the enqueuing `setItem`, so a resolved save can tell if it is stale. */
	seq: number;
};

// Module-level (not per-persistence-instance) so the flush listeners below are
// registered exactly once, even though `ChatView` remounts a fresh persistence
// object on every conversation switch.
const pending = new Map<string, PendingSave>();

/** Highest `seq` assigned per conversation; the newest snapshot enqueued so far. */
const latestSeq = new Map<string, number>();

/**
 * Per-id promise chain: each commit awaits the previous one for the same
 * conversation, so concurrent saves (a debounced write racing the tab-hide
 * flush) land in enqueue order instead of resolve order.
 */
const saveChains = new Map<string, Promise<void>>();

/**
 * A `fetch` that survives document unload, for the tab-hide/close flush so an
 * abandoned document doesn't drop the request. Mind the ~64KB keepalive body
 * cap; a very large `messages` blob may exceed it.
 */
const keepaliveFetch: typeof fetch = (input, init) => fetch(input, { ...init, keepalive: true });

function commit(id: string, { keepalive = false }: { keepalive?: boolean } = {}) {
	const entry = pending.get(id);
	if (!entry) return;
	pending.delete(id);
	const { snapshot, queryClient, seq } = entry;

	const dispatch = () =>
		saveConversationMessages({
			data: { id, messages: snapshot },
			...(keepalive ? { fetch: keepaliveFetch } : {}),
		})
			.then(() => {
				// A newer snapshot enqueued since this one would overwrite it; skip the
				// stale cache write, but still refresh the sidebar order (this save bumped
				// `updatedAt`, and the newer save refreshes it again on its own turn).
				if (latestSeq.get(id) === seq) {
					queryClient.setQueryData(conversationQueryOptions(id).queryKey, (prev) =>
						prev ? { ...prev, messages: snapshot } : prev,
					);
				}
				void queryClient.invalidateQueries({ queryKey: conversationsQueryOptions().queryKey });
			})
			.catch(() => {
				toast.error("Failed to save the conversation");
			});

	// Dispatch immediately when nothing is in flight (so the tab-hide keepalive
	// request actually leaves during unload); only chain behind a prior save for
	// the same conversation, so overlapping saves land in enqueue order, not resolve
	// order. `dispatch` never rejects, so the chain link always starts clean.
	const prior = saveChains.get(id);
	const run = prior ? prior.then(dispatch) : dispatch();
	saveChains.set(id, run);
	void run.finally(() => {
		if (saveChains.get(id) === run) saveChains.delete(id);
	});
}

/** Commits every pending save with a keepalive fetch; runs on tab hide/close. */
export function flushAll() {
	for (const [id, { timer }] of pending) {
		clearTimeout(timer);
		commit(id, { keepalive: true });
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
export function createChatPersistence(queryClient: QueryClient): ChatClientPersistence {
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
			const seq = (latestSeq.get(id) ?? 0) + 1;
			latestSeq.set(id, seq);
			const timer = setTimeout(() => commit(id), SAVE_DEBOUNCE_MS);
			pending.set(id, { timer, snapshot, queryClient, seq });
		},
		removeItem: async (id) => {
			clearTimeout(pending.get(id)?.timer);
			pending.delete(id);
			latestSeq.delete(id);
			saveChains.delete(id);
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
