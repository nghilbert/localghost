import type { UIMessage } from "@tanstack/ai-client";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { authedFn } from "#/shared/lib/middleware";
import {
	findConversation,
	findConversations,
	findDefaultSelection,
	insertConversation,
	patchConversation,
	probeModelRunState,
	removeConversation,
	saveMessages,
	searchConversations,
} from "./conversation.server";
import { storedMessages } from "./messages";
import {
	conversationIdInput,
	createConversationInput,
	saveMessagesInput,
	searchConversationsInput,
	updateConversationInput,
} from "./schemas";

/** Sidebar list: only the fields needed to render and order conversation links. */
export const listConversations = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => findConversations({ ownerId: context.userId }));

/** Full-text search over conversation transcripts; empty for a blank query. */
export const searchConversationsFn = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(searchConversationsInput)
	.handler(async ({ data: { query }, context }) => {
		if (!query.trim()) return [];
		return searchConversations({ ownerId: context.userId, query });
	});

/**
 * Full conversation row, including the `messages` blob and endpoint config.
 * @throws If no conversation with that id is owned by the current user.
 */
export const getConversation = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(conversationIdInput)
	.handler(async ({ data: { id }, context }) => {
		const conversation = await findConversation({ id, ownerId: context.userId });
		if (!conversation) throw new Error("Not found");
		return conversation;
	});

/** A conversation as the query cache holds it: the row with `messages` typed. */
export type ConversationDetail = Omit<Awaited<ReturnType<typeof getConversation>>, "messages"> & {
	messages: UIMessage[];
};

/**
 * The endpoint and model the New-chat draft page pre-fills, persisting nothing.
 * Prefers the user's most recently used model. A fully null selection means the
 * page prompts the user.
 */
export const getDefaultSelection = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => findDefaultSelection({ ownerId: context.userId }));

/**
 * Creates a conversation locked to the model selection, seeded with the first
 * user message and a derived title. Called on the first send, so no empty rows
 * are persisted and the message survives navigation to the conversation view.
 */
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
 * Persist the conversation's `messages` blob. Called by the client persistence
 * adapter on every message-list change; this is the only write path for chat
 * content (the stream route writes nothing).
 */
export const saveConversationMessages = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(saveMessagesInput)
	.handler(async ({ data: { id, messages }, context }) => {
		await saveMessages({ id, ownerId: context.userId, messages });
	});

/**
 * Patch a conversation's title. The model is fixed at creation and not
 * patchable (changing model means starting a new chat).
 * @throws If no conversation with that id is owned by the current user.
 */
export const updateConversation = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(updateConversationInput)
	.handler(async ({ data: { id, data: patch }, context }) =>
		patchConversation({ id, ownerId: context.userId, patch }),
	);

/** Whether the conversation's model is still loading into memory (local runtime warm-up). */
export const getModelRunState = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(conversationIdInput)
	.handler(async ({ data: { id }, context }) =>
		probeModelRunState({ id, ownerId: context.userId }),
	);

/** Delete a conversation by id. No-op when the id isn't owned by the current user. */
export const deleteConversation = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(conversationIdInput)
	.handler(async ({ data: { id }, context }) => {
		await removeConversation({ id, ownerId: context.userId });
	});

// ── Query options (for TanStack Query) ───────────────────────

export const conversationsQueryOptions = () =>
	queryOptions({ queryKey: ["conversations"], queryFn: () => listConversations() });

export const conversationSearchQueryOptions = ({ query }: { query: string }) =>
	queryOptions({
		queryKey: ["conversation-search", query],
		queryFn: () => searchConversationsFn({ data: { query } }),
	});

export const conversationQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["conversation", id],
		// The server fn returns `messages` as the raw JSONB value (UIMessage isn't
		// provably serializable to Start's validator); type it at the query seam.
		queryFn: async (): Promise<ConversationDetail> => {
			const conversation = await getConversation({ data: { id } });
			return { ...conversation, messages: storedMessages(conversation.messages) };
		},
	});

export const defaultSelectionQueryOptions = () =>
	queryOptions({
		queryKey: ["conversation", "default-selection"],
		queryFn: () => getDefaultSelection(),
	});

export const modelRunStateQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["conversation", id, "run-state"],
		queryFn: () => getModelRunState({ data: { id } }),
	});
