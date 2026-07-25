import { prisma } from "#/shared/lib/db.server";
import { listModels } from "#/shared/lib/llamacpp/client.server";
import { buildFirstUserMessage, deriveConversationTitle } from "./messages";

/** Sidebar list: only the fields needed to render and order conversation links. */
export function findConversations({ ownerId }: { ownerId: string }) {
	return prisma.conversation.findMany({
		where: { ownerId },
		orderBy: { updatedAt: "desc" },
		select: { id: true, title: true, model: true, endpointId: true, updatedAt: true },
	});
}

/** One sidebar search hit: the list fields plus a plain-text snippet of the match. */
export type ConversationSearchHit = {
	id: string;
	title: string;
	model: string | null;
	endpointId: string | null;
	updatedAt: Date;
	snippet: string;
};

/**
 * Full-text search over conversation transcripts (the `messages` text parts),
 * ranked by relevance. The tsvector is computed at query time from the flattened
 * text parts (no stored column/index — fine for a local per-user table), and the
 * snippet is a `ts_headline` over that same text.
 */
export function searchConversations({
	ownerId,
	query,
}: {
	ownerId: string;
	query: string;
}): Promise<ConversationSearchHit[]> {
	return prisma.$queryRaw<ConversationSearchHit[]>`
		SELECT c.id,
		       c.title,
		       c.model,
		       c.endpoint_id AS "endpointId",
		       c.updated_at AS "updatedAt",
		       ts_headline('english', flat.text, q,
		         'StartSel=<<<,StopSel=>>>,MaxFragments=1,MaxWords=16,MinWords=6') AS snippet
		FROM conversation c
		CROSS JOIN LATERAL (
			SELECT string_agg(part->>'content', ' ') AS text
			FROM jsonb_array_elements(c.messages) AS msg,
			     jsonb_array_elements(msg->'parts') AS part
			WHERE part->>'type' = 'text'
		) flat,
		websearch_to_tsquery('english', ${query}) q
		WHERE c.owner_id = ${ownerId}::uuid AND to_tsvector('english', flat.text) @@ q
		ORDER BY ts_rank(to_tsvector('english', flat.text), q) DESC
		LIMIT 20`;
}

/** Full conversation row with client-safe endpoint config, or null when not owned. */
export function findConversation({ id, ownerId }: { id: string; ownerId: string }) {
	return prisma.conversation.findFirst({
		where: { id, ownerId },
		include: { endpoint: { select: { id: true, name: true, url: true, provider: true } } },
	});
}

/** The conversation with its complete endpoint row (encrypted key included) for a chat run. */
export function findConversationWithEndpoint({ id, ownerId }: { id: string; ownerId: string }) {
	return prisma.conversation.findFirst({
		where: { id, ownerId },
		include: { endpoint: true },
	});
}

/** The most recently used (endpointId, model) pair, or nulls when there is none. */
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

/** Creates a conversation seeded with the first user message and a derived title. */
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
	return prisma.conversation.create({
		data: {
			ownerId,
			endpointId,
			model,
			title: deriveConversationTitle(firstMessage) ?? undefined,
			messages: JSON.parse(JSON.stringify([message])),
		},
		select: { id: true },
	});
}

/** Persist the `messages` blob (opaque UIMessage[] wire value). No-op when the id isn't owned. */
export async function saveMessages({
	id,
	ownerId,
	messages,
}: {
	id: string;
	ownerId: string;
	messages: unknown[];
}): Promise<void> {
	await prisma.conversation.updateMany({
		where: { id, ownerId },
		data: { messages: JSON.parse(JSON.stringify(messages)) },
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
	const existing = await prisma.conversation.findFirst({ where: { id, ownerId } });
	if (!existing) throw new Error("Not found");
	return prisma.conversation.update({
		where: { id },
		data: { ...(patch.title !== undefined && { title: patch.title }) },
		include: { endpoint: { select: { id: true, name: true, url: true, provider: true } } },
	});
}

export type ModelRunState = "warming" | "ready" | "unreachable";

/**
 * Whether the conversation's model is still loading. Only llama.cpp has a
 * warm-up (`GET /models`'s `status` reports it); other providers read "ready".
 * A failed probe is "unreachable": reporting a down host as "ready" would hide
 * the problem. The router autoloads on first request, so "unloaded" also
 * reads as "ready" rather than "warming".
 */
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

/** Delete a conversation by id. No-op when the id isn't owned. */
export async function removeConversation({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<void> {
	await prisma.conversation.deleteMany({ where: { id, ownerId } });
}
