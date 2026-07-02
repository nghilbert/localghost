/** Draft-page tool toggles carried to the new conversation. */
export type ChatHandoff = {
	enabledTools: string[];
	forceWebSearch: boolean;
};

const handoffKey = (conversationId: string) => `chat-handoff:${conversationId}`;

/**
 * Stores the draft page's ephemeral tool toggles for a freshly created
 * conversation in `sessionStorage`. The first message is persisted at creation,
 * so a lost handoff only falls back to default toggles.
 */
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
