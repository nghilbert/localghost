import type { ChatClientPersistence, UIMessage } from "@tanstack/ai-client";
import { fetchServerSentEvents } from "@tanstack/ai-client";
import { useChat } from "@tanstack/ai-react";
import { useMemo } from "react";
import type { Slot } from "#/features/compare/lib/types";

// Shared SSE connection — the existing chat stream route handles all slots.
const connection = fetchServerSentEvents("/api/chat/stream");

/** In-memory persistence for compare slots — no DB writes; compare is ephemeral. */
function createComparePersistence(): ChatClientPersistence {
	const store = new Map<string, UIMessage[]>();
	return {
		getItem: (id) => Promise.resolve(store.get(id) ?? []),
		setItem: (id, msgs) => {
			store.set(id, msgs);
			return Promise.resolve();
		},
		removeItem: (id) => {
			store.delete(id);
			return Promise.resolve();
		},
	};
}

// One persistence store shared across all slots in the compare session.
const comparePersistence = createComparePersistence();

type SlotChat = {
	messages: UIMessage[];
	status: string;
	sendMessage: (content: string) => Promise<void>;
	stop: () => void;
};

/** Drives a single compare slot with its own `useChat` instance. */
export function useCompareSlot(slot: Slot): SlotChat {
	const forwardedProps = useMemo(
		() => (slot.conversationId ? { conversationId: slot.conversationId } : null),
		[slot.conversationId],
	);

	const { messages, sendMessage, stop, status } = useChat({
		connection,
		persistence: comparePersistence,
		id: slot.conversationId ?? `slot-unconfigured-${slot.id}`,
		forwardedProps: forwardedProps ?? { conversationId: "" },
	});

	return { messages, status, sendMessage, stop };
}
