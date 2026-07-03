import type { UIMessage } from "@tanstack/ai-client";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { ollamaClient } from "#/features/library/lib/ollama/client.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { listModels } from "#/lib/llm.server";
import { orderEndpointsForDefault } from "./default-selection";
import { buildFirstUserMessage, deriveConversationTitle, storedMessages } from "./messages";
import {
	conversationIdInput,
	createConversationInput,
	saveMessagesInput,
	updateConversationInput,
} from "./schemas";

/** Sidebar list: only the fields needed to render and order conversation links. */
export const listConversations = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.conversation.findMany({
		where: { ownerId: userId },
		orderBy: { updatedAt: "desc" },
		select: { id: true, title: true, model: true, endpointId: true, updatedAt: true },
	});
});

/**
 * Full conversation row, including the `messages` blob and endpoint config.
 * @throws If no conversation with that id is owned by the current user.
 */
export const getConversation = createServerFn({ method: "POST" })
	.validator(conversationIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		const conversation = await prisma.conversation.findFirst({
			where: { id, ownerId: userId },
			include: { endpoint: { select: { id: true, name: true, url: true, provider: true } } },
		});
		if (!conversation) throw new Error("Not found");
		return conversation;
	});

/** A conversation as the query cache holds it: the row with `messages` typed. */
export type ConversationDetail = Omit<Awaited<ReturnType<typeof getConversation>>, "messages"> & {
	messages: UIMessage[];
};

/**
 * The endpoint and model the New-chat draft page pre-fills, persisting nothing.
 * Prefers the built-in Ollama, then the oldest endpoint, picking only one that
 * returns a model. A fully null selection means the page prompts the user.
 */
export const getDefaultSelection = createServerFn({ method: "GET" }).handler(
	async (): Promise<{ endpointId: string | null; model: string | null }> => {
		const userId = await getCurrentUserId();
		const endpoints = await prisma.modelEndpoint.findMany({
			where: { ownerId: userId },
			orderBy: { id: "asc" },
		});

		for (const endpoint of orderEndpointsForDefault(endpoints)) {
			try {
				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
				const [model] = await listModels({ url: endpoint.url, apiKey });
				if (model) return { endpointId: endpoint.id, model };
			} catch {
				// Unreachable or rejected; fall through to the next endpoint.
			}
		}
		return { endpointId: null, model: null };
	},
);

/**
 * Creates a conversation locked to the model selection, seeded with the first
 * user message and a derived title. Called on the first send, so no empty rows
 * are persisted and the message survives navigation to the conversation view.
 */
export const createConversation = createServerFn({ method: "POST" })
	.validator(createConversationInput)
	.handler(async ({ data: { selection, firstMessage } }) => {
		const userId = await getCurrentUserId();
		const message = buildFirstUserMessage(firstMessage);
		const conversation = await prisma.conversation.create({
			data: {
				ownerId: userId,
				endpointId: selection.endpointId,
				model: selection.model,
				title: deriveConversationTitle(firstMessage) ?? undefined,
				messages: JSON.parse(JSON.stringify([message])),
			},
			select: { id: true },
		});
		return { id: conversation.id };
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
		await prisma.conversation.updateMany({
			where: { id, ownerId: userId },
			data: { messages: JSON.parse(JSON.stringify(messages)) },
		});
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
		const existing = await prisma.conversation.findFirst({ where: { id, ownerId: userId } });
		if (!existing) throw new Error("Not found");
		return prisma.conversation.update({
			where: { id },
			data: { ...(patch.title !== undefined && { title: patch.title }) },
			include: { endpoint: { select: { id: true, name: true, url: true, provider: true } } },
		});
	});

/**
 * Whether the conversation's model is still loading. Only Ollama has a warm-up
 * (first use loads the model into memory; `ps()` reports what's loaded); other
 * providers and unknown states read "ready".
 */
export const getModelRunState = createServerFn({ method: "POST" })
	.validator(conversationIdInput)
	.handler(async ({ data: { id } }): Promise<"warming" | "ready"> => {
		const userId = await getCurrentUserId();
		const conversation = await prisma.conversation.findFirst({
			where: { id, ownerId: userId },
			select: { model: true, endpoint: { select: { url: true, provider: true } } },
		});
		if (!conversation?.model || conversation.endpoint?.provider !== "ollama") return "ready";
		try {
			const { models } = await ollamaClient({
				host: conversation.endpoint.url,
				timeoutMs: 3_000,
			}).ps();
			const loaded = models.some(({ name, model }) =>
				[name, model].includes(conversation.model ?? ""),
			);
			return loaded ? "ready" : "warming";
		} catch {
			return "ready";
		}
	});

/** Delete a conversation by id. No-op when the id isn't owned by the current user. */
export const deleteConversation = createServerFn({ method: "POST" })
	.validator(conversationIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await prisma.conversation.deleteMany({ where: { id, ownerId: userId } });
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
