import { createServerFn } from "@tanstack/react-start";
import { authedFn } from "#/lib/middleware";
import {
	chatRunIdSchema,
	conversationIdInput,
	createConversationInput,
	searchConversationsInput,
	updateConversationInput,
} from "./chat.schemas";
import {
	cancelChatRun,
	findConversation,
	findConversations,
	findDefaultSelection,
	insertConversation,
	patchConversation,
	probeModelRunState,
	removeConversation,
	searchConversations,
} from "./server/chat.server";

/** The user's conversations for the sidebar, most recent first. */
export const listConversations = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => findConversations({ ownerId: context.userId }));

/** Full-text search over the user's transcripts. A blank query returns nothing. */
export const searchConversationsFn = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(searchConversationsInput)
	.handler(async ({ data: { query }, context }) => {
		if (!query.trim()) return [];
		return searchConversations({ ownerId: context.userId, query });
	});

/**
 * A conversation with its transcript and endpoint.
 * @throws If the user does not own the conversation.
 */
export const getConversation = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(conversationIdInput)
	.handler(async ({ data: { id }, context }) => {
		const conversation = await findConversation({ id, ownerId: context.userId });
		if (!conversation) throw new Error("Not found");
		return conversation;
	});

/** The most recently used endpoint and model, to pre-fill a new chat. Nulls when there is none. */
export const getDefaultSelection = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => findDefaultSelection({ ownerId: context.userId }));

/** Creates a conversation with its first message on the first send, so no empty chats are saved. */
export const createConversation = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(createConversationInput)
	.handler(async ({ data: { selection, firstMessage, attachments }, context }) =>
		insertConversation({
			ownerId: context.userId,
			endpointId: selection.endpointId,
			model: selection.model,
			firstMessage,
			attachments,
		}),
	);

/**
 * Renames a conversation. Its model is fixed at creation.
 * @throws If the user does not own the conversation.
 */
export const updateConversation = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(updateConversationInput)
	.handler(async ({ data: { id, data: patch }, context }) =>
		patchConversation({ id, ownerId: context.userId, patch }),
	);

/** Whether the conversation's local model is still loading. */
export const getModelRunState = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(conversationIdInput)
	.handler(async ({ data: { id }, context }) =>
		probeModelRunState({ id, ownerId: context.userId }),
	);

/** Deletes a conversation the user owns. */
export const deleteConversation = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(conversationIdInput)
	.handler(async ({ data: { id }, context }) => {
		await removeConversation({ id, ownerId: context.userId });
	});

/** Which built-in tools the server offers. Web search needs `SEARXNG_URL`. */
export const getToolAvailability = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async () => ({ webSearch: Boolean(process.env.SEARXNG_URL) }));

/** Marks a chat run as cancelled, so the stream stops it when the client disconnects. */
export const requestChatRunCancel = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(chatRunIdSchema)
	.handler(async ({ data: runId, context }) => cancelChatRun({ runId, ownerId: context.userId }));
