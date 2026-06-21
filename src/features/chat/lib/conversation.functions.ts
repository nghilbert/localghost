import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { callLLM } from "#/lib/llm.server";
import {
	conversationIdInput,
	createConversationSchema,
	renameConversationInput,
	saveMessagesInput,
	searchConversationsInput,
	updateConversationInput,
} from "./schemas";

/** Sidebar list — only the fields needed to render and order conversation links. */
export const listConversations = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.conversation.findMany({
		where: { ownerId: userId, archived: false },
		orderBy: { updatedAt: "desc" },
		select: { id: true, title: true, model: true, updatedAt: true },
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
				endpointId: data.endpointId ?? null,
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
				...(patch.model !== undefined && { model: patch.model }),
				...(patch.endpointId !== undefined && { endpointId: patch.endpointId }),
				...(patch.archived !== undefined && { archived: patch.archived }),
			},
		});
	});

export const deleteConversation = createServerFn({ method: "POST" })
	.validator(conversationIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await prisma.conversation.deleteMany({ where: { id, ownerId: userId } });
	});

/**
 * Substring search across every conversation's `messages` blob, matching the
 * text content of any message part via a read-time JSONB traversal (no generated
 * column, so migrations stay Prisma-generated). Per-user chat volume is small,
 * so the sequential scan is acceptable.
 */
export const searchConversations = createServerFn({ method: "POST" })
	.validator(searchConversationsInput)
	.handler(async ({ data: { query } }) => {
		const userId = await getCurrentUserId();
		const rows = await prisma.$queryRaw<
			Array<{ id: string; title: string; snippet: string | null; updatedAt: Date }>
		>`
			SELECT c.id, c.title, c.updated_at AS "updatedAt",
			       (
			         SELECT part->>'content'
			         FROM jsonb_array_elements(c.messages) AS msg,
			              jsonb_array_elements(msg->'parts') AS part
			         WHERE part->>'type' = 'text'
			           AND part->>'content' ILIKE ${`%${query}%`}
			         LIMIT 1
			       ) AS snippet
			FROM conversation c
			WHERE c.owner_id = ${userId}::uuid
			  AND c.archived = false
			  AND EXISTS (
			    SELECT 1
			    FROM jsonb_array_elements(c.messages) AS msg,
			         jsonb_array_elements(msg->'parts') AS part
			    WHERE part->>'type' = 'text'
			      AND part->>'content' ILIKE ${`%${query}%`}
			  )
			ORDER BY c.updated_at DESC
			LIMIT 30
		`;
		return rows.map((r) => ({
			id: r.id,
			title: r.title,
			snippet: (r.snippet ?? "").slice(0, 200),
			updatedAt: r.updatedAt,
		}));
	});

/** Phrases a weak model emits instead of a title — refusals, meta, or filler. */
const BAD_TITLE =
	/^(i\s|i'm|sorry|as an ai|no conversation|here('s| is)|sure[,!]|title:|untitled)/i;

/**
 * Validates a model-generated chat title, returning a clean title or `null` when
 * the output is unusable (empty, a refusal/meta sentence, or too long to be a
 * title) so the caller can fall back to the user's own words. Weak local models
 * routinely emit refusals like "No conversation to summarize yet" — those must
 * never be stored as titles.
 */
export function sanitizeTitle(raw: string): string | null {
	const firstLine = raw.split("\n")[0]?.trim() ?? "";
	const cleaned = firstLine.replace(/^["']|["'.!?]+$/g, "").trim();
	if (!cleaned) return null;
	if (BAD_TITLE.test(cleaned)) return null;
	if (cleaned.split(/\s+/).length > 8) return null;
	return cleaned.slice(0, 80);
}

/**
 * Auto-name a brand-new conversation from its first exchange. No-ops unless the
 * title is still the default, so it is safe to call on every first `onFinish`.
 * Falls back to the leading words of the user's message if the model call fails
 * or returns an unusable title.
 */
export const renameConversation = createServerFn({ method: "POST" })
	.validator(renameConversationInput)
	.handler(async ({ data: { id, userText, assistantText } }) => {
		const userId = await getCurrentUserId();
		const conversation = await prisma.conversation.findFirst({
			where: { id, ownerId: userId },
			include: { endpoint: true },
		});
		if (!conversation) return null;
		if (conversation.title !== "New Chat") return null;
		if (!conversation.endpoint || !userText.trim()) return null;

		const apiKey = conversation.endpoint.apiKeyEncrypted
			? decrypt(conversation.endpoint.apiKeyEncrypted)
			: undefined;

		const fallbackTitle = userText.split(/\s+/).slice(0, 6).join(" ").slice(0, 80);

		let title = fallbackTitle;
		try {
			const generated = await callLLM({
				url: conversation.endpoint.url,
				apiKey,
				model: conversation.model,
				messages: [
					{
						role: "user",
						content: `Summarize this conversation in 4-6 words as a chat title. No quotes, no punctuation at the end.\n\nUser: ${userText.slice(0, 500)}\nAssistant: ${assistantText.slice(0, 500)}`,
					},
				],
				temperature: 0.3,
				maxTokens: 20,
			});
			title = sanitizeTitle(generated) ?? fallbackTitle;
		} catch {
			title = fallbackTitle;
		}

		if (!title) return null;
		await prisma.conversation.update({ where: { id }, data: { title } });
		return { title };
	});

// ── Query options (for TanStack Query) ───────────────────────

export const conversationsQueryOptions = () =>
	queryOptions({ queryKey: ["conversations"], queryFn: () => listConversations() });

export const conversationQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["conversation", id],
		queryFn: () => getConversation({ data: { id } }),
	});
