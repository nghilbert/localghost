import { z } from "zod";

/** The tool toggles a new chat was sent with, read once by its conversation page. */
const newChatSchema = z.object({
	enabledTools: z.array(z.string()),
});

/** The tool toggles a new chat was sent with. */
export type NewChat = z.infer<typeof newChatSchema>;

const storageKey = (conversationId: string) => `new-chat:${conversationId}`;

/**
 * Saves a new chat's tool toggles in `sessionStorage` for its conversation page. The first
 * message is already saved on the server, so losing this only resets the toggles.
 */
export function storeNewChat({
	conversationId,
	newChat,
}: {
	conversationId: string;
	newChat: NewChat;
}): void {
	sessionStorage.setItem(storageKey(conversationId), JSON.stringify(newChat));
}

/** Reads and removes a conversation's new chat toggles. Null on the server or when absent. */
export function takeNewChat(conversationId: string): NewChat | null {
	if (typeof sessionStorage === "undefined") return null;
	const raw = sessionStorage.getItem(storageKey(conversationId));
	if (!raw) return null;
	sessionStorage.removeItem(storageKey(conversationId));
	try {
		const parsed = newChatSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
