import { db } from "#/prisma/db";
import { deleteChatThreadRows } from "#/shared/domain/chat/persistence.server";
import { listModels } from "#/shared/lib/llamacpp/client.server";
import { nowTimestamp } from "#/shared/lib/temporal";
import { deriveConversationTitle, threadMessagesFrom } from "./messages";

/** One sidebar list entry: the fields needed to render and order conversation links. */
export type ConversationListItem = {
	id: string;
	title: string;
	model: string | null;
	endpointId: string | null;
	updatedAt: Date;
};

/** Sidebar list, ordered by whichever is more recent: the last message or a metadata edit (e.g. a title rename). */
async function findConversations({
	ownerId,
}: {
	ownerId: string;
}): Promise<ConversationListItem[]> {
	const plan = db.raw.sql`
		SELECT c.id,
		       c.title,
		       c.model,
		       c.endpoint_id AS "endpointId",
		       GREATEST(c.updated_at, COALESCE(ct.updated_at, c.updated_at)) AS "updatedAt"
		FROM conversation c
		LEFT JOIN chat_thread ct ON ct.thread_id = c.id::text
		WHERE c.owner_id = ${ownerId}::uuid
		ORDER BY "updatedAt" DESC`
		.returnsRow({
			id: "pg/uuid@1",
			title: "pg/text@1",
			model: { codecId: "pg/text@1", nullable: true },
			endpointId: { codecId: "pg/uuid@1", nullable: true },
			updatedAt: "pg/timestamp-temporal@1",
		})
		.build();
	const rows = await db.runtime().query(plan);
	return rows.map((row) => ({ ...row, updatedAt: new Date(row.updatedAt.toString()) }));
}

export { findConversations };

/** One sidebar search hit: the list fields plus a plain-text snippet of the match. */
export type ConversationSearchHit = {
	id: string;
	title: string;
	model: string | null;
	endpointId: string | null;
	updatedAt: Date;
	snippet: string;
};

/** Full-text transcript search ranked by relevance.
 * Computes the tsvector from flattened message text and returns a headline snippet.
 */
export async function searchConversations({
	ownerId,
	query,
}: {
	ownerId: string;
	query: string;
}): Promise<ConversationSearchHit[]> {
	// `ModelMessage.content` is a string, an array of `ContentPart` (text/image/…),
	// or null; only the string case and text parts contribute searchable text.
	const plan = db.raw.sql`
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
		LIMIT 20`
		.returnsRow({
			id: "pg/uuid@1",
			title: "pg/text@1",
			model: { codecId: "pg/text@1", nullable: true },
			endpointId: { codecId: "pg/uuid@1", nullable: true },
			updatedAt: "pg/timestamp-temporal@1",
			snippet: "pg/text@1",
		})
		.build();
	const rows = await db.runtime().query(plan);
	return rows.map((row) => ({ ...row, updatedAt: new Date(row.updatedAt.toString()) }));
}

/** Full conversation row with client-safe endpoint config and its transcript, or null when not owned. */
export async function findConversation({ id, ownerId }: { id: string; ownerId: string }) {
	const conversation = await db.orm.public.Conversation.where({ id, ownerId })
		.include("endpoint", (e) => e.select("id", "name", "url", "provider"))
		.first();
	if (!conversation) return null;
	const thread = await db.orm.public.ChatThread.select("messages").first({ threadId: id });
	return { ...conversation, messages: thread?.messages ?? [] };
}

/** The conversation with its complete endpoint row (encrypted key included) for a chat run. */
export function findConversationWithEndpoint({ id, ownerId }: { id: string; ownerId: string }) {
	return db.orm.public.Conversation.where({ id, ownerId })
		.include("endpoint", (e) =>
			e.select(
				"id",
				"name",
				"url",
				"apiKeyEncrypted",
				"provider",
				"options",
				"ownerId",
				"updatedAt",
				"discovered",
			),
		)
		.first();
}

/** Whether `id` is a conversation owned by `ownerId`. For authorization checks that need no row data. */
export async function conversationOwnedBy({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<boolean> {
	const { total } = await db.orm.public.Conversation.where({ id, ownerId }).aggregate((a) => ({
		total: a.count(),
	}));
	return total > 0;
}

/** The most recently used (endpointId, model) pair, or nulls when there is none. */
export async function findDefaultSelection({
	ownerId,
}: {
	ownerId: string;
}): Promise<{ endpointId: string | null; model: string | null }> {
	const recent = await db.orm.public.Conversation.where({ ownerId })
		.where((c) => c.endpointId.isNotNull())
		.where((c) => c.model.isNotNull())
		.orderBy((c) => c.updatedAt.desc())
		.select("endpointId", "model")
		.first();
	return recent?.endpointId && recent.model
		? { endpointId: recent.endpointId, model: recent.model }
		: { endpointId: null, model: null };
}

/**
 * Creates a conversation seeded with the first user message and a derived
 * title, plus its `ChatThread` transcript row, so the message survives
 * navigation to the conversation view before the model has replied.
 */
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
	const messages = threadMessagesFrom({
		content: firstMessage,
		images: attachments.filter((attachment) => attachment.kind === "image"),
		documents: attachments.filter((attachment) => attachment.kind === "document"),
	});
	const title = deriveConversationTitle(firstMessage);

	return db.transaction(async (tx) => {
		const conversation = await tx.orm.public.Conversation.select("id").create({
			ownerId,
			endpointId,
			model,
			...(title !== null ? { title } : {}),
			updatedAt: nowTimestamp(),
		});
		await tx.orm.public.ChatThread.create({
			threadId: conversation.id,
			messages,
			updatedAt: nowTimestamp(),
		});
		return conversation;
	});
}

/**
 * Patch a conversation's mutable fields (today: `title`).
 * @throws If no conversation with that id is owned by the user.
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
	const existing = await db.orm.public.Conversation.where({ id, ownerId }).first();
	if (!existing) throw new Error("Not found");
	return db.orm.public.Conversation.where({ id })
		.include("endpoint", (e) => e.select("id", "name", "url", "provider"))
		.update({
			...(patch.title !== undefined && { title: patch.title }),
			updatedAt: nowTimestamp(),
		});
}

export type ModelRunState = "warming" | "ready" | "unreachable";

/** Reports llama.cpp loading state; other providers are always ready.
 * A failed llama.cpp probe is unreachable, while unloaded models are ready.
 */
export async function probeModelRunState({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<ModelRunState> {
	const conversation = await db.orm.public.Conversation.where({ id, ownerId })
		.select("model")
		.include("endpoint", (e) => e.select("url", "provider"))
		.first();
	if (!conversation?.model || conversation.endpoint?.provider !== "llamacpp") return "ready";
	try {
		const models = await listModels({ url: conversation.endpoint.url, timeoutMs: 3_000 });
		const found = models.find((m) => m.id === conversation.model);
		return found?.status.value === "loading" ? "warming" : "ready";
	} catch (error) {
		console.warn("Model run-state probe failed; reporting the host unreachable", {
			url: conversation.endpoint.url,
			model: conversation.model,
			error,
		});
		return "unreachable";
	}
}

/**
 * Delete a conversation by id, plus its chat-persistence rows. No-op when the
 * id isn't owned. `ChatThread`/`ChatRun`/`ChatInterrupt` have no foreign key to
 * `Conversation` (see the schema comment), so cleanup is explicit here rather
 * than a cascade.
 */
export async function removeConversation({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<void> {
	await db.transaction(async (tx) => {
		const owned = await tx.orm.public.Conversation.select("id").where({ id, ownerId }).first();
		if (!owned) return;
		await deleteChatThreadRows({ tx, threadId: id });
		await tx.orm.public.Conversation.where({ id, ownerId }).delete();
	});
}
