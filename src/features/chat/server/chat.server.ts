import { requestRunCancel, uiMessageToModelMessages } from "@tanstack/ai";
import { buildFirstUserMessage, deriveConversationTitle } from "#/features/chat/lib/messages";
import { prisma } from "#/lib/db.server";
import { MS_PER_SECOND } from "#/lib/format";
import { listModels } from "#/lib/llamacpp/client.server";
import { log } from "#/lib/log.server";
import { chatPersistence, findRunThreadId } from "./persistence.server";

/** A conversation in the sidebar list. */
type ConversationListItem = {
	id: string;
	title: string;
	model: string | null;
	endpointId: string | null;
	updatedAt: Date;
};

/** The user's conversations, most recently active first, counting both messages and renames. */
export function findConversations({
	ownerId,
}: {
	ownerId: string;
}): Promise<ConversationListItem[]> {
	return prisma.$queryRaw<ConversationListItem[]>`
		SELECT c.id,
		       c.title,
		       c.model,
		       c.endpoint_id AS "endpointId",
		       GREATEST(c.updated_at, COALESCE(ct.updated_at, c.updated_at)) AS "updatedAt"
		FROM conversation c
		LEFT JOIN chat_thread ct ON ct.thread_id = c.id::text
		WHERE c.owner_id = ${ownerId}::uuid
		ORDER BY "updatedAt" DESC`;
}

/** A conversation search result with a snippet of the match. */
type ConversationSearchHit = {
	id: string;
	title: string;
	model: string | null;
	endpointId: string | null;
	updatedAt: Date;
	snippet: string;
};

/** Full-text search over the user's transcripts, best match first, with a snippet. */
export function searchConversations({
	ownerId,
	query,
}: {
	ownerId: string;
	query: string;
}): Promise<ConversationSearchHit[]> {
	// `content` is a string, an array of parts, or null. Only text is searched.
	return prisma.$queryRaw<ConversationSearchHit[]>`
		SELECT c.id,
		       c.title,
		       c.model,
		       c.endpoint_id AS "endpointId",
		       c.updated_at AS "updatedAt",
		       ts_headline('english', flat.text, q,
		         'StartSel=<<<,StopSel=>>>,MaxFragments=1,MaxWords=16,MinWords=6') AS snippet
		FROM conversation c
		JOIN chat_thread ct ON ct.thread_id = c.id::text
		CROSS JOIN LATERAL (
			SELECT string_agg(
				CASE jsonb_typeof(msg->'content')
					WHEN 'string' THEN msg->>'content'
					WHEN 'array' THEN (
						SELECT string_agg(part->>'content', ' ')
						FROM jsonb_array_elements(msg->'content') AS part
						WHERE part->>'type' = 'text'
					)
					ELSE NULL
				END, ' '
			) AS text
			FROM jsonb_array_elements(ct.messages) AS msg
		) flat,
		websearch_to_tsquery('english', ${query}) q
		WHERE c.owner_id = ${ownerId}::uuid AND to_tsvector('english', flat.text) @@ q
		ORDER BY ts_rank(to_tsvector('english', flat.text), q) DESC
		LIMIT 20`;
}

/** A conversation with its transcript and endpoint (no key), or null when the user does not own it. */
export async function findConversation({ id, ownerId }: { id: string; ownerId: string }) {
	const conversation = await prisma.conversation.findFirst({
		where: { id, ownerId },
		include: { endpoint: { select: { id: true, name: true, url: true, provider: true } } },
	});
	if (!conversation) return null;
	const [thread, lastRun] = await Promise.all([
		prisma.chatThread.findUnique({ where: { threadId: id }, select: { messages: true } }),
		prisma.chatRun.findFirst({
			where: { threadId: id },
			orderBy: { startedAt: "desc" },
			select: { status: true, error: true },
		}),
	]);
	return {
		...conversation,
		messages: thread?.messages ?? [],
		// The client keeps a failed run's error only until a reload, so the last one is sent along.
		lastRunError: lastRun?.status === "failed" ? (lastRun.error ?? "") : null,
	};
}

/** A conversation with its full endpoint row, encrypted key included, for a chat run. */
export function findConversationWithEndpoint({ id, ownerId }: { id: string; ownerId: string }) {
	return prisma.conversation.findFirst({
		where: { id, ownerId },
		include: { endpoint: true },
	});
}

/** Whether the user owns the conversation. */
export async function conversationOwnedBy({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<boolean> {
	const count = await prisma.conversation.count({ where: { id, ownerId } });
	return count > 0;
}

/** The most recently used endpoint and model, or nulls when there is none. */
export async function findDefaultSelection({
	ownerId,
}: {
	ownerId: string;
}): Promise<{ endpointId: string | null; model: string | null }> {
	const recent = await prisma.conversation.findFirst({
		where: { ownerId, endpointId: { not: null }, model: { not: null } },
		orderBy: { updatedAt: "desc" },
		select: { endpointId: true, model: true },
	});
	return recent?.endpointId && recent.model
		? { endpointId: recent.endpointId, model: recent.model }
		: { endpointId: null, model: null };
}

/** Creates a conversation, its title, and its `ChatThread` holding the first message. */
export async function insertConversation({
	ownerId,
	endpointId,
	model,
	firstMessage,
	attachments = [],
}: {
	ownerId: string;
	endpointId: string;
	model: string;
	firstMessage: string;
	attachments?: Array<{
		dataUrl: string;
		mimeType: string;
		name: string;
		kind: "image" | "document";
	}>;
}): Promise<{ id: string }> {
	const message = buildFirstUserMessage({
		content: firstMessage,
		images: attachments.filter((attachment) => attachment.kind === "image"),
		documents: attachments.filter((attachment) => attachment.kind === "document"),
	});
	const messages = JSON.parse(JSON.stringify(uiMessageToModelMessages(message)));

	return prisma.$transaction(async (tx) => {
		const conversation = await tx.conversation.create({
			data: {
				ownerId,
				endpointId,
				model,
				title: deriveConversationTitle(firstMessage) ?? undefined,
			},
			select: { id: true },
		});
		await tx.chatThread.create({ data: { threadId: conversation.id, messages } });
		return conversation;
	});
}

/**
 * Updates a conversation's title.
 * @throws If the user does not own the conversation.
 */
export async function patchConversation({
	id,
	ownerId,
	patch,
}: {
	id: string;
	ownerId: string;
	patch: { title?: string };
}) {
	const existing = await prisma.conversation.findFirst({ where: { id, ownerId } });
	if (!existing) throw new Error("Not found");
	return prisma.conversation.update({
		where: { id },
		data: { ...(patch.title !== undefined && { title: patch.title }) },
		include: { endpoint: { select: { id: true, name: true, url: true, provider: true } } },
	});
}

/** Whether a conversation's model can answer now. */
type ModelRunState = "warming" | "ready" | "unreachable";

/** Whether a llama.cpp model is still loading. Other providers are always ready. */
export async function probeModelRunState({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<ModelRunState> {
	const conversation = await prisma.conversation.findFirst({
		where: { id, ownerId },
		select: { model: true, endpoint: { select: { url: true, provider: true } } },
	});
	if (!conversation?.model || conversation.endpoint?.provider !== "llamacpp") return "ready";
	try {
		const models = await listModels({
			url: conversation.endpoint.url,
			timeoutMs: 3 * MS_PER_SECOND,
		});
		const found = models.find((m) => m.id === conversation.model);
		return found?.status.value === "loading" ? "warming" : "ready";
	} catch (error) {
		log.warn(
			{
				err: error,
				userId: ownerId,
				conversationId: id,
				url: conversation.endpoint.url,
				model: conversation.model,
			},
			"Model run-state probe failed; reporting the host unreachable",
		);
		return "unreachable";
	}
}

/**
 * Deletes a conversation the user owns, with its thread, runs, and interrupts. Those
 * tables have no foreign key to `Conversation`, so they are deleted here.
 */
export async function removeConversation({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<void> {
	const owned = await prisma.conversation.findFirst({
		where: { id, ownerId },
		select: { id: true },
	});
	if (!owned) return;
	await prisma.$transaction([
		prisma.chatThread.deleteMany({ where: { threadId: id } }),
		prisma.chatRun.deleteMany({ where: { threadId: id } }),
		prisma.chatInterrupt.deleteMany({ where: { threadId: id } }),
		prisma.conversation.deleteMany({ where: { id, ownerId } }),
	]);
}

/**
 * Marks a run as cancelled so the stream can tell Stop apart from a dropped connection.
 * Does nothing unless the user owns the run's conversation.
 */
export async function cancelChatRun({
	runId,
	ownerId,
}: {
	runId: string;
	ownerId: string;
}): Promise<void> {
	const threadId = await findRunThreadId({ runId });
	if (!threadId || !(await conversationOwnedBy({ id: threadId, ownerId }))) return;
	await requestRunCancel(chatPersistence.stores.runs, runId);
}
