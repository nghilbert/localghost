import { z } from "zod/v4";
import { db } from "#/prisma/db";
import type { ImportBackupCounts } from "#/shared/domain/backup/schemas";
import { samplingOptionsSchema } from "#/shared/domain/endpoint/schemas";
import { embed } from "#/shared/domain/memory/embeddings.server";
import { insertMemory } from "#/shared/domain/memory/memory.server";
import { listModelSettings } from "#/shared/domain/model-setting/model-setting.server";
import { perModelOptionsSchema } from "#/shared/domain/model-setting/schemas";
import { llmProviderSchema } from "#/shared/lib/llm/provider";
import { nowTimestamp } from "#/shared/lib/temporal";

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
		db.orm.public.Memory.where({ ownerId: userId })
			.orderBy((m) => m.id.asc())
			.all(),
		db.orm.public.Conversation.where({ ownerId: userId })
			.select("id", "title", "model")
			.orderBy((c) => c.updatedAt.desc())
			.all(),
		db.orm.public.User.where({ id: userId }).select("systemPrompt", "temperature").first(),
		// apiKeyEncrypted is deliberately never selected; see the schema comment.
		db.orm.public.Endpoint.where({ ownerId: userId })
			.select("name", "url", "provider", "options")
			.orderBy((e) => e.id.asc())
			.all(),
		listModelSettings({ ownerId: userId }),
	]);
	const conversationIds = conversations.map((c) => c.id);
	const threads = conversationIds.length
		? await db.orm.public.ChatThread.where((t) => t.threadId.in(conversationIds))
				.select("threadId", "messages")
				.all()
		: [];
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
				? db.orm.public.Memory.where({ ownerId: userId }).select("text", "category").all()
				: [],
			incomingConversations.length
				? db.orm.public.Conversation.where({ ownerId: userId }).select("id", "title").all()
				: [],
			needEndpoints
				? db.orm.public.Endpoint.where({ ownerId: userId }).select("id", "url", "provider").all()
				: [],
			incomingModelSettings.length
				? db.orm.public.ModelSetting.where({ ownerId: userId }).select("endpointId", "model").all()
				: [],
		]);
	const normalizedExistingEndpoints = existingEndpoints.map((endpoint) => ({
		...endpoint,
		...normalizeLegacyEndpoint(endpoint),
	}));
	const existingConversationIds = existingConversations.map((c) => c.id);
	const existingThreads = existingConversationIds.length
		? await db.orm.public.ChatThread.where((t) => t.threadId.in(existingConversationIds))
				.select("threadId", "messages")
				.all()
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
	const inserted = await db.transaction(async (tx) => {
		if (payload.userSettings) {
			const existing = await tx.orm.public.User.select("systemPrompt", "temperature")
				.where({ id: userId })
				.first();
			await tx.orm.public.User.where({ id: userId }).update({
				systemPrompt: existing?.systemPrompt ?? payload.userSettings.systemPrompt ?? null,
				temperature: existing?.temperature ?? payload.userSettings.temperature ?? null,
				updatedAt: nowTimestamp(),
			});
		}
		for (const [index, memory] of memories.entries()) {
			await insertMemory({
				client: tx,
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
			const created = await tx.orm.public.Endpoint.select("id").create({
				name: endpoint.name,
				url: endpoint.url,
				provider: endpoint.provider,
				ownerId: userId,
				...(endpoint.options ? { options: endpoint.options } : {}),
				updatedAt: nowTimestamp(),
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
			await tx.orm.public.ModelSetting.create({
				endpointId,
				model: setting.model,
				options: setting.options,
				ownerId: userId,
				updatedAt: nowTimestamp(),
			});
			modelSettings += 1;
		}

		// No `createMany`: each conversation needs its generated id paired with a
		// `ChatThread` row, which a bulk insert can't return ids for.
		for (const conversation of conversations) {
			const created = await tx.orm.public.Conversation.select("id").create({
				title: conversation.title,
				model: conversation.model,
				ownerId: conversation.ownerId,
				updatedAt: nowTimestamp(),
			});
			await tx.orm.public.ChatThread.create({
				threadId: created.id,
				messages: conversation.messages,
				updatedAt: nowTimestamp(),
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
