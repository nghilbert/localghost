import { z } from "zod/v4";
import { prisma } from "#/shared/lib/db.server";

/** Shape accepted by {@link importBackup}; also used by the route to validate the upload. */
export const importPayloadSchema = z.object({
	version: z.number().optional(),
	userSettings: z
		.object({ systemPrompt: z.string().nullish(), temperature: z.number().nullish() })
		.nullish(),
	memories: z
		.array(
			z.object({ text: z.string(), category: z.string().nullish(), source: z.string().optional() }),
		)
		.optional(),
	conversations: z
		.array(
			z.object({
				title: z.string().optional(),
				model: z.string().nullish(),
				messages: z.unknown(),
			}),
		)
		.optional(),
});

export type ImportPayload = z.infer<typeof importPayloadSchema>;

/** Serializable backup of a user's memories, recent chats, and chat defaults. */
export async function exportBackup({ userId, email }: { userId: string; email: string }) {
	const [memories, conversations, userSettings] = await Promise.all([
		prisma.memory.findMany({ where: { ownerId: userId }, orderBy: { id: "asc" } }),
		prisma.conversation.findMany({
			where: { ownerId: userId },
			orderBy: { updatedAt: "desc" },
			take: 50,
			select: { title: true, model: true, messages: true },
		}),
		prisma.user.findUnique({
			where: { id: userId },
			select: { systemPrompt: true, temperature: true },
		}),
	]);

	return {
		version: 2,
		exportedAt: new Date().toISOString(),
		exportedBy: email,
		userSettings: userSettings
			? { systemPrompt: userSettings.systemPrompt, temperature: userSettings.temperature }
			: null,
		memories: memories.map((m) => ({ text: m.text, category: m.category, source: m.source })),
		conversations: conversations.map((c) => ({
			title: c.title,
			model: c.model,
			// The framework's `UIMessage[]` blob, round-tripped verbatim.
			messages: c.messages,
		})),
	};
}

/**
 * Merges a backup into the user's account non-destructively: settings only fill fields the
 * user hasn't set, and memories/conversations are appended. Returns how many rows landed.
 */
export async function importBackup({
	userId,
	payload,
}: {
	userId: string;
	payload: ImportPayload;
}): Promise<{ memories: number; conversations: number }> {
	if (payload.userSettings) {
		const existing = await prisma.user.findUnique({
			where: { id: userId },
			select: { systemPrompt: true, temperature: true },
		});
		await prisma.user.update({
			where: { id: userId },
			data: {
				systemPrompt: existing?.systemPrompt ?? payload.userSettings.systemPrompt ?? null,
				temperature: existing?.temperature ?? payload.userSettings.temperature ?? null,
			},
		});
	}

	const memories = (payload.memories ?? [])
		.filter((m) => m?.text)
		.map((m) => ({
			text: m.text,
			category: m.category ?? "fact",
			source: m.source ?? "import",
			ownerId: userId,
		}));

	const conversations = (payload.conversations ?? []).map((c) => ({
		title: c.title ?? "Imported chat",
		model: c.model ?? "",
		// Round-trip to a clean JSON blob for the `messages` JSONB column. The endpoint is
		// not restored (ids are account-specific), so the chat reconnects once a model is picked.
		messages: JSON.parse(JSON.stringify(c.messages ?? [])),
		ownerId: userId,
	}));

	const [insertedMemories, insertedConversations] = await Promise.all([
		memories.length ? prisma.memory.createMany({ data: memories }) : { count: 0 },
		conversations.length ? prisma.conversation.createMany({ data: conversations }) : { count: 0 },
	]);

	return { memories: insertedMemories.count, conversations: insertedConversations.count };
}
