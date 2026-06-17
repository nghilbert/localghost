import type { ChatClientPersistence } from "@tanstack/ai-client";
import {
	deleteConversation,
	getConversation,
	saveConversationMessages,
} from "#/features/chat/lib/conversation.functions";

/**
 * The `@tanstack/ai-client` persistence contract backed by the `Conversation`
 * row's `messages` blob. The client owns persistence end-to-end: it hydrates from
 * `getItem` and writes the full `UIMessage[]` on every change via `setItem`, so
 * the chat stream route performs no database writes.
 */
export function createChatPersistence(): ChatClientPersistence {
	return {
		getItem: async (id) => {
			const conversation = await getConversation({ data: { id } });
			// `messages` is the stored JSONB blob holding the framework's own
			// `UIMessage[]` shape; round-trip to a plain typed value for the persistor.
			return JSON.parse(JSON.stringify(conversation.messages));
		},
		setItem: async (id, messages) => {
			// Round-trip to plain JSON so the value is a clean, serializable blob for
			// the JSONB column (and assignable to the server fn's validated input).
			await saveConversationMessages({
				data: { id, messages: JSON.parse(JSON.stringify(messages)) },
			});
		},
		removeItem: async (id) => {
			await deleteConversation({ data: { id } });
		},
	};
}
