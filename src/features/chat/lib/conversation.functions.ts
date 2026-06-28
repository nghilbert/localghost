import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { prisma } from "#/lib/db.server";
import {
	conversationIdInput,
	createConversationSchema,
	saveMessagesInput,
	updateConversationInput,
} from "./schemas";

/** Default title a conversation keeps until its first message names it. */
const DEFAULT_TITLE = "New Chat";

const textPartSchema = z.object({ type: z.literal("text"), content: z.string() });

/**
 * Derives a chat title from the leading words of the first user message, or
 * `null` when there's no usable text yet. Deterministic and model-free — used to
 * name a brand-new conversation on its first save.
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

/** Sidebar list — only the fields needed to render and order conversation links. */
export const listConversations = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.conversation.findMany({
		where: { ownerId: userId, archived: false },
		orderBy: { updatedAt: "desc" },
		select: { id: true, title: true, model: true, endpointId: true, updatedAt: true },
	});
});

/** Full conversation row, including the `messages` blob and endpoint config. */
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

export const createConversation = createServerFn({ method: "POST" })
	.validator(createConversationSchema)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return prisma.conversation.create({
			data: {
				title: data.title,
				endpointId: data.endpointId,
				model: data.model,
				ownerId: userId,
			},
		});
	});

/**
 * Persist the conversation's `messages` blob. Called by the client persistence
 * adapter on every message-list change — this is the only write path for chat
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
				...(patch.selection !== undefined && {
					endpointId: patch.selection.endpointId,
					model: patch.selection.model,
				}),
			},
			include: { endpoint: { select: { id: true, name: true, url: true, provider: true } } },
		});
	});

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
