import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { ollamaClient } from "#/features/library/lib/ollama/client.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { listModels } from "#/lib/llm.server";
import { orderEndpointsForDefault } from "./default-selection";
import { buildFirstUserMessage, deriveConversationTitle } from "./messages";
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
		where: { ownerId: userId, archived: false },
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

/**
 * The endpoint and model the New-chat draft page pre-fills, without persisting anything.
 * Prefers the built-in Ollama, then the oldest added endpoint, and only picks one that
 * actually returns a model. Returns a fully null selection when nothing is usable; the
 * draft page then prompts the user to pick one.
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
 * Creates a conversation locked to the given model selection, seeded with the
 * first user message and a title derived from it. Called on the first send from
 * the draft page, so no empty rows are ever persisted and the message survives
 * the navigation to the conversation view, which requests the response.
 * @returns The new conversation's id.
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
 * Patch a conversation's title and/or archived flag. The model is fixed at creation
 * and deliberately not patchable here (changing model means starting a new chat).
 * @returns The updated row with its endpoint config included.
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
			data: {
				...(patch.title !== undefined && { title: patch.title }),
				...(patch.archived !== undefined && { archived: patch.archived }),
			},
			include: { endpoint: { select: { id: true, name: true, url: true, provider: true } } },
		});
	});

/**
 * Whether the conversation's model is warming up. Ollama loads a model into
 * memory on first use (often tens of seconds); `ps()` reports what's loaded.
 * Other providers have no warm-up concept and always read "ready", as does any
 * state we can't determine.
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
		queryFn: () => getConversation({ data: { id } }),
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
