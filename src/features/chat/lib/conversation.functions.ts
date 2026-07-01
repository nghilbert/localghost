import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { listModels } from "#/lib/llm.server";
import { orderEndpointsForDefault } from "./default-selection";
import {
	conversationIdInput,
	createConversationInput,
	saveMessagesInput,
	updateConversationInput,
} from "./schemas";

/** Default title a conversation keeps until its first message names it. */
const DEFAULT_TITLE = "New Chat";

const textPartSchema = z.object({ type: z.literal("text"), content: z.string() });

/**
 * Derives a chat title from the leading words of the first user message.
 * Deterministic and model-free, used to name a brand-new conversation on its first save.
 * @returns The derived title, or `null` when the messages hold no usable text yet.
 */
function deriveTitle(messages: Array<Record<string, unknown>>): string | null {
	const firstUser = messages.find((m) => m.role === "user");
	const parts = z.array(z.unknown()).safeParse(firstUser?.parts);
	if (!parts.success) return null;
	const text = parts.data
		.map((part) => textPartSchema.safeParse(part))
		.flatMap((result) => (result.success ? [result.data.content] : []))
		.join("")
		.trim();
	if (!text) return null;
	return text.split(/\s+/).slice(0, 6).join(" ").slice(0, 80);
}

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
 * Creates a conversation locked to the given model selection. Called on the first
 * message send from the draft page, so no empty rows are ever persisted; the model is
 * fixed at creation and never changes (a different model means a new chat).
 * @returns The new conversation's id.
 */
export const createConversation = createServerFn({ method: "POST" })
	.validator(createConversationInput)
	.handler(async ({ data: { selection } }) => {
		const userId = await getCurrentUserId();
		const conversation = await prisma.conversation.create({
			data: { ownerId: userId, endpointId: selection.endpointId, model: selection.model },
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
		// Name the conversation from its first message while it's still untitled; the
		// guarded `where` makes this a no-op once a title exists (manual rename wins).
		const title = deriveTitle(messages);
		if (title) {
			await prisma.conversation.updateMany({
				where: { id, ownerId: userId, title: DEFAULT_TITLE },
				data: { title },
			});
		}
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
