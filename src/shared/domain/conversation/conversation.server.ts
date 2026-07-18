import { EventType } from "@tanstack/ai/client";
import { endpointApiKey } from "#/shared/domain/endpoint/endpoint.server";
import { prisma } from "#/shared/lib/db.server";
import { asLLMProvider, streamLLMEvents } from "#/shared/lib/llm.server";
import { ollamaClient } from "#/shared/lib/ollama/client.server";
import {
	buildFirstUserMessage,
	deriveConversationTitle,
	partsText,
	sanitizeGeneratedTitle,
	storedMessages,
} from "./messages";

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

const TITLE_PROMPT =
	"Generate a short title (at most six words) for the conversation excerpt in the user message. Reply with only the title: no quotes, no trailing punctuation, no explanation.";
const TITLE_EXCERPT_CHARS = 1000;

/**
 * Titles the first exchange via the conversation's own model and persists it.
 * Skips when the title no longer matches the derived default (manual rename).
 * @returns The new title, or `null` when skipped or generation fails.
 */
export async function generateTitle({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<string | null> {
	const conversation = await findConversationWithEndpoint({ id, ownerId });
	if (!conversation?.endpoint || !conversation.model) return null;

	const messages = storedMessages(conversation.messages);
	const userText = partsText(messages.find((m) => m.role === "user")?.parts ?? []);
	const assistantText = partsText(messages.find((m) => m.role === "assistant")?.parts ?? []);
	if (!userText.trim() || !assistantText.trim()) return null;
	if (conversation.title !== deriveConversationTitle(userText)) return null;

	try {
		const excerpt = `User: ${userText.slice(0, TITLE_EXCERPT_CHARS)}\n\nAssistant: ${assistantText.slice(0, TITLE_EXCERPT_CHARS)}`;
		let raw = "";
		for await (const chunk of streamLLMEvents({
			url: conversation.endpoint.url,
			provider: asLLMProvider(conversation.endpoint.provider),
			apiKey: endpointApiKey(conversation.endpoint),
			model: conversation.model,
			messages: [{ role: "user", content: excerpt }],
			systemPrompt: TITLE_PROMPT,
			temperature: 0.3,
			maxTokens: 64,
		})) {
			if (chunk.type === EventType.TEXT_MESSAGE_CONTENT) raw += chunk.delta;
		}

		const title = sanitizeGeneratedTitle(raw);
		if (!title) return null;
		await prisma.conversation.update({ where: { id }, data: { title } });
		return title;
	} catch (error) {
		console.warn("Title generation failed; keeping the derived title", {
			url: conversation.endpoint.url,
			model: conversation.model,
			error,
		});
		return null;
	}
}

export type ModelRunState = "warming" | "ready" | "unreachable";

/**
 * Whether the conversation's model is still loading. Only Ollama has a warm-up
 * (`ps()` reports what's loaded); other providers read "ready". A failed probe
 * is "unreachable": reporting a down host as "ready" would hide the problem.
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
