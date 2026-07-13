import type { UIMessage } from "@tanstack/ai-client";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUserId } from "#/shared/lib/session.server";
import {
	findConversation,
	findConversations,
	findDefaultSelection,
	generateTitle,
	insertConversation,
	patchConversation,
	probeModelRunState,
	removeConversation,
	saveMessages,
} from "./conversation.server";
import { storedMessages } from "./messages";
import {
	conversationIdInput,
	createConversationInput,
	saveMessagesInput,
	updateConversationInput,
} from "./schemas";

/** Sidebar list: only the fields needed to render and order conversation links. */
export const listConversations = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return findConversations({ ownerId: userId });
});

/**
 * Full conversation row, including the `messages` blob and endpoint config.
 * @throws If no conversation with that id is owned by the current user.
 */
export const getConversation = createServerFn({ method: "POST" })
	.validator(conversationIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		const conversation = await findConversation({ id, ownerId: userId });
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
export const getDefaultSelection = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return findDefaultSelection({ ownerId: userId });
});

/**
 * Creates a conversation locked to the model selection, seeded with the first
 * user message and a derived title. Called on the first send, so no empty rows
 * are persisted and the message survives navigation to the conversation view.
 */
export const createConversation = createServerFn({ method: "POST" })
	.validator(createConversationInput)
	.handler(async ({ data: { selection, firstMessage } }) => {
		const userId = await getCurrentUserId();
		return insertConversation({
			ownerId: userId,
			endpointId: selection.endpointId,
			model: selection.model,
			firstMessage,
		});
	});

/**
 * Persist the conversation's `messages` blob. Called by the client persistence
 * adapter on every message-list change; this is the only write path for chat
 * content (the stream route writes nothing).
 */
export const saveConversationMessages = createServerFn({ method: "POST" })
	.validator(saveMessagesInput)
	.handler(async ({ data: { id, messages } }) => {
		const userId = await getCurrentUserId();
		await saveMessages({ id, ownerId: userId, messages });
	});

/**
 * Patch a conversation's title. The model is fixed at creation and not
 * patchable (changing model means starting a new chat).
 * @throws If no conversation with that id is owned by the current user.
 */
export const updateConversation = createServerFn({ method: "POST" })
	.validator(updateConversationInput)
	.handler(async ({ data: { id, data: patch } }) => {
		const userId = await getCurrentUserId();
		return patchConversation({ id, ownerId: userId, patch });
	});

/**
 * Generates and persists an LLM title for the conversation's first exchange.
 * @returns The new title, or `null` when skipped (manual rename) or generation fails.
 */
export const generateConversationTitle = createServerFn({ method: "POST" })
	.validator(conversationIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		return generateTitle({ id, ownerId: userId });
	});

/** Whether the conversation's model is still loading into memory (Ollama warm-up). */
export const getModelRunState = createServerFn({ method: "POST" })
	.validator(conversationIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		return probeModelRunState({ id, ownerId: userId });
	});

/** Delete a conversation by id. No-op when the id isn't owned by the current user. */
export const deleteConversation = createServerFn({ method: "POST" })
	.validator(conversationIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await removeConversation({ id, ownerId: userId });
	});

// ── Query options (for TanStack Query) ───────────────────────

export const conversationsQueryOptions = () =>
	queryOptions({ queryKey: ["conversations"], queryFn: () => listConversations() });

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
