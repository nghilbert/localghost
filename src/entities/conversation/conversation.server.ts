import { prisma } from "#/shared/lib/db.server";
import { ollamaClient } from "#/shared/lib/ollama/client.server";
import { buildFirstUserMessage, deriveConversationTitle } from "./messages";

/** Sidebar list: only the fields needed to render and order conversation links. */
export function findConversations({ ownerId }: { ownerId: string }) {
	return prisma.conversation.findMany({
		where: { ownerId },
		orderBy: { updatedAt: "desc" },
		select: { id: true, title: true, model: true, endpointId: true, updatedAt: true },
	});
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
}: {
	ownerId: string;
	endpointId: string;
	model: string;
	firstMessage: string;
}): Promise<{ id: string }> {
	const message = buildFirstUserMessage(firstMessage);
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

/**
 * Whether the conversation's model is still loading. Only Ollama has a warm-up
 * (`ps()` reports what's loaded); other providers and unknown states read "ready".
 */
export async function probeModelRunState({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<"warming" | "ready"> {
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
	} catch {
		return "ready";
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
