import { z } from "zod/v4";
import type { ImportBackupCounts } from "#/shared/domain/backup/schemas";
import { samplingOptionsSchema } from "#/shared/domain/endpoint/schemas";
import { embed } from "#/shared/domain/memory/embeddings.server";
import { insertMemory } from "#/shared/domain/memory/memory.server";
import { listModelSettings } from "#/shared/domain/model-setting/model-setting.server";
import { perModelOptionsSchema } from "#/shared/domain/model-setting/schemas";
import { prisma } from "#/shared/lib/db.server";
import { llmProviderSchema } from "#/shared/lib/llm-provider";

/** The backup format this build writes; imports claiming a newer one are rejected.
 * Bumped to 4: `conversations[].messages` is now `ModelMessage[]`, not `UIMessage[]`.
 */
export const BACKUP_VERSION = 4;

const backupEndpointProviderSchema = z.union([llmProviderSchema, z.literal("ollama")]);

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
	// Endpoints and per-model settings (v3). Keys are never exported: they're
	// useless under a different ENCRYPTION_KEY and shouldn't leave the instance.
	endpoints: z
		.array(
			z.object({
				name: z.string(),
				url: z.string(),
				provider: backupEndpointProviderSchema,
				options: samplingOptionsSchema.nullish(),
			}),
		)
		.optional(),
	modelSettings: z
		.array(
			z.object({
				endpointUrl: z.string(),
				endpointName: z.string().nullish(),
				provider: backupEndpointProviderSchema,
				model: z.string(),
				options: perModelOptionsSchema,
			}),
		)
		.optional(),
});

export type ImportPayload = z.infer<typeof importPayloadSchema>;

/**
 * The minimum shape a stored transcript needs to round-trip as `ModelMessage[]`;
 * loose so unknown fields survive. A conversation failing this (including one
 * exported in the pre-`ModelMessage` `{ id, role, parts }` format) is counted
 * invalid and skipped instead of stored as a blob the persistence layer chokes on.
 */
const transcriptSchema = z.array(
	z.looseObject({
		role: z.string(),
		content: z
			.union([z.string(), z.array(z.looseObject({ type: z.string() })), z.null()])
			.optional(),
	}),
);

function trimTrailingSlashes(value: string): string {
	let end = value.length;
	while (end > 0 && value[end - 1] === "/") end -= 1;
	return value.slice(0, end);
}

function normalizeLegacyEndpoint({ url, provider }: { url: string; provider: string }): {
	url: string;
	provider: string;
} {
	if (provider !== "ollama") return { url, provider };
	const normalizedUrl = trimTrailingSlashes(url);
	return {
		url: normalizedUrl.endsWith("/v1") ? normalizedUrl : `${normalizedUrl}/v1`,
		provider: "openai",
	};
}

/** Serializable backup of a user's memories, recent chats, and chat defaults. */
export async function exportBackup({ userId, email }: { userId: string; email: string }) {
	const [memories, conversations, userSettings, endpoints, modelSettings] = await Promise.all([
		prisma.memory.findMany({ where: { ownerId: userId }, orderBy: { id: "asc" } }),
		prisma.conversation.findMany({
			where: { ownerId: userId },
			orderBy: { updatedAt: "desc" },
			select: { id: true, title: true, model: true },
		}),
		prisma.user.findUnique({
			where: { id: userId },
			select: { systemPrompt: true, temperature: true },
		}),
		prisma.endpoint.findMany({
			where: { ownerId: userId },
			orderBy: { id: "asc" },
			// apiKeyEncrypted is deliberately never selected; see the schema comment.
			select: { name: true, url: true, provider: true, options: true },
		}),
		listModelSettings({ ownerId: userId }),
	]);
	const threads = await prisma.chatThread.findMany({
		where: { threadId: { in: conversations.map((c) => c.id) } },
		select: { threadId: true, messages: true },
	});
	const messagesByThreadId = new Map(threads.map((t) => [t.threadId, t.messages]));

	return {
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		exportedBy: email,
		userSettings: userSettings
			? { systemPrompt: userSettings.systemPrompt, temperature: userSettings.temperature }
			: null,
		memories: memories.map((m) => ({ text: m.text, category: m.category, source: m.source })),
		conversations: conversations.map((c) => ({
			title: c.title,
			model: c.model,
			// The framework's `ModelMessage[]` blob, round-tripped verbatim.
			messages: messagesByThreadId.get(c.id) ?? [],
		})),
		// Endpoints without their keys; the Settings UI flags each as needing a key on import.
		endpoints: endpoints.map((endpoint) => {
			const normalized = normalizeLegacyEndpoint(endpoint);
			return {
				name: endpoint.name,
				url: normalized.url,
				provider: normalized.provider,
				options: endpoint.options,
			};
		}),
		// Keyed by the endpoint's url + provider so they re-attach after the endpoints are re-created.
		modelSettings: modelSettings.map((setting) => {
			const endpoint = normalizeLegacyEndpoint(setting.endpoint);
			return {
				endpointUrl: endpoint.url,
				endpointName: setting.endpoint.name,
				provider: endpoint.provider,
				model: setting.model,
				options: setting.options,
			};
		}),
	};
}

/** `text` + `category` identify a memory for dedup; two rows with both equal are the same. */
function memoryKey({ text, category }: { text: string; category: string }): string {
	return `${category}\u0000${text}`;
}

/** `title` + the serialized `messages` blob identify a conversation for dedup. */
function conversationKey({ title, messages }: { title: string; messages: unknown }): string {
	return `${title}\u0000${JSON.stringify(messages)}`;
}

/** `provider` + `url` identify an endpoint for dedup and for re-attaching model settings. */
function endpointKey({ url, provider }: { url: string; provider: string }): string {
	return `${provider} ${url}`;
}

/** `endpointId` + `model` identify a per-model setting row (its unique constraint). */
function modelSettingKey({ endpointId, model }: { endpointId: string; model: string }): string {
	return `${endpointId} ${model}`;
}

/**
 * Merges a backup into the user's account non-destructively: settings only fill fields the
 * user hasn't set, and memories/conversations/endpoints/model-settings already present are
 * skipped so re-importing the same file is a no-op instead of duplicating everything.
 */
export async function importBackup({
	userId,
	payload,
}: {
	userId: string;
	payload: ImportPayload;
}): Promise<ImportBackupCounts> {
	const incomingMemories = (payload.memories ?? [])
		.filter((m) => m?.text)
		.map((m) => ({
			text: m.text,
			category: m.category ?? "fact",
			source: m.source ?? "import",
		}));

	const incomingEndpoints = (payload.endpoints ?? [])
		.filter((endpoint) => endpoint?.url && endpoint?.name)
		.map((endpoint) => ({
			...endpoint,
			...normalizeLegacyEndpoint(endpoint),
		}));
	const incomingModelSettings = (payload.modelSettings ?? [])
		.filter((setting) => setting?.model && setting?.endpointUrl)
		.map((setting) => {
			const endpoint = normalizeLegacyEndpoint({
				url: setting.endpointUrl,
				provider: setting.provider,
			});
			return {
				...setting,
				endpointUrl: endpoint.url,
				provider: endpoint.provider,
			};
		});

	let invalidConversations = 0;
	const incomingConversations = (payload.conversations ?? []).flatMap((c) => {
		const transcript = transcriptSchema.safeParse(c.messages ?? []);
		if (!transcript.success) {
			invalidConversations += 1;
			return [];
		}
		return [
			{
				title: c.title ?? "Imported chat",
				model: c.model ?? "",
				// Round-trip to a clean JSON blob for the `messages` JSONB column. The endpoint is
				// not restored (ids are account-specific), so the chat reconnects once a model is picked.
				messages: JSON.parse(JSON.stringify(transcript.data)),
				ownerId: userId,
			},
		];
	});

	// Existing endpoints are needed whenever endpoints OR model settings are imported:
	// model settings re-attach to endpoints that already existed as well as freshly created ones.
	const needEndpoints = incomingEndpoints.length > 0 || incomingModelSettings.length > 0;
	const [existingMemories, existingConversations, existingEndpoints, existingModelSettings] =
		await Promise.all([
			incomingMemories.length
				? prisma.memory.findMany({
						where: { ownerId: userId },
						select: { text: true, category: true },
					})
				: [],
			incomingConversations.length
				? prisma.conversation.findMany({
						where: { ownerId: userId },
						select: { id: true, title: true },
					})
				: [],
			needEndpoints
				? prisma.endpoint.findMany({
						where: { ownerId: userId },
						select: { id: true, url: true, provider: true },
					})
				: [],
			incomingModelSettings.length
				? prisma.modelSetting.findMany({
						where: { ownerId: userId },
						select: { endpointId: true, model: true },
					})
				: [],
		]);
	const normalizedExistingEndpoints = existingEndpoints.map((endpoint) => ({
		...endpoint,
		...normalizeLegacyEndpoint(endpoint),
	}));
	const existingThreads = existingConversations.length
		? await prisma.chatThread.findMany({
				where: { threadId: { in: existingConversations.map((c) => c.id) } },
				select: { threadId: true, messages: true },
			})
		: [];
	const existingMessagesByThreadId = new Map(existingThreads.map((t) => [t.threadId, t.messages]));
	const existingMemoryKeys = new Set(existingMemories.map(memoryKey));
	const existingConversationKeys = new Set(
		existingConversations.map((c) =>
			conversationKey({ title: c.title, messages: existingMessagesByThreadId.get(c.id) ?? [] }),
		),
	);
	const existingEndpointKeys = new Set(normalizedExistingEndpoints.map(endpointKey));

	const memories = incomingMemories.filter((m) => !existingMemoryKeys.has(memoryKey(m)));
	const conversations = incomingConversations.filter(
		(c) => !existingConversationKeys.has(conversationKey(c)),
	);
	const endpointsToCreate = incomingEndpoints.filter(
		(e) => !existingEndpointKeys.has(endpointKey(e)),
	);

	// Embedded ahead of the transaction: these are external calls and don't belong
	// inside one. A failed embedding stores a NULL vector, same as a fresh save.
	const memoryEmbeddings = await Promise.all(
		memories.map((memory) => embed({ text: memory.text, ownerId: userId })),
	);

	// One transaction: a mid-import failure rolls everything back instead of
	// leaving a half-imported account.
	const inserted = await prisma.$transaction(async (tx) => {
		if (payload.userSettings) {
			const existing = await tx.user.findUnique({
				where: { id: userId },
				select: { systemPrompt: true, temperature: true },
			});
			await tx.user.update({
				where: { id: userId },
				data: {
					systemPrompt: existing?.systemPrompt ?? payload.userSettings.systemPrompt ?? null,
					temperature: existing?.temperature ?? payload.userSettings.temperature ?? null,
				},
			});
		}
		for (const [index, memory] of memories.entries()) {
			await insertMemory({
				db: tx,
				ownerId: userId,
				text: memory.text,
				category: memory.category,
				embedding: memoryEmbeddings[index] ?? null,
				source: memory.source,
			});
		}

		// Create missing endpoints with no key (hasApiKey: false), then map every
		// endpoint the user now has (existing + created) by url+provider so model
		// settings can re-attach to the right id.
		const endpointIdByKey = new Map(
			normalizedExistingEndpoints.map((endpoint) => [endpointKey(endpoint), endpoint.id]),
		);
		for (const endpoint of endpointsToCreate) {
			const created = await tx.endpoint.create({
				data: {
					name: endpoint.name,
					url: endpoint.url,
					provider: endpoint.provider,
					ownerId: userId,
					...(endpoint.options ? { options: endpoint.options } : {}),
				},
				select: { id: true },
			});
			endpointIdByKey.set(endpointKey(endpoint), created.id);
		}

		// Re-attach model settings to their endpoint; skip when the endpoint can't be
		// resolved or a setting for that (endpoint, model) already exists.
		const settingKeys = new Set(existingModelSettings.map(modelSettingKey));
		let modelSettings = 0;
		for (const setting of incomingModelSettings) {
			const endpointId = endpointIdByKey.get(
				endpointKey({ url: setting.endpointUrl, provider: setting.provider }),
			);
			if (!endpointId) continue;
			const key = modelSettingKey({ endpointId, model: setting.model });
			if (settingKeys.has(key)) continue;
			settingKeys.add(key);
			await tx.modelSetting.create({
				data: {
					endpointId,
					model: setting.model,
					options: setting.options,
					ownerId: userId,
				},
			});
			modelSettings += 1;
		}

		// No `createMany`: each conversation needs its generated id paired with a
		// `ChatThread` row, which a bulk insert can't return ids for.
		for (const conversation of conversations) {
			const created = await tx.conversation.create({
				data: {
					title: conversation.title,
					model: conversation.model,
					ownerId: conversation.ownerId,
				},
				select: { id: true },
			});
			await tx.chatThread.create({
				data: { threadId: created.id, messages: conversation.messages },
			});
		}
		return {
			conversations: conversations.length,
			endpoints: endpointsToCreate.length,
			modelSettings,
		};
	});

	return {
		memories: memories.length,
		conversations: inserted.conversations,
		endpoints: inserted.endpoints,
		modelSettings: inserted.modelSettings,
		skippedMemories: incomingMemories.length - memories.length,
		skippedConversations: incomingConversations.length - conversations.length,
		skippedEndpoints: incomingEndpoints.length - endpointsToCreate.length,
		skippedModelSettings: incomingModelSettings.length - inserted.modelSettings,
		invalidConversations,
	};
}
