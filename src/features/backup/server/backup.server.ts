import { z } from "zod";
import type { ImportBackupCounts } from "#/features/backup/backup.schemas";
import { perModelOptionsSchema } from "#/features/library/library.schemas";
import { listModelSettings } from "#/features/library/server/model-setting.server";
import { embed } from "#/features/memory/server/embeddings.server";
import { insertMemory } from "#/features/memory/server/memory.server";
import { prisma } from "#/lib/db.server";
import { BodyTooLargeError, readJsonWithLimit } from "#/lib/http.server";
import { llmProviderSchema } from "#/lib/llm-provider";
import { samplingOptionsSchema } from "#/lib/llm-schemas";

/** The backup format this build writes. Imports claiming a newer one are rejected. */
const BACKUP_VERSION = 4;

/** A backup file as {@link importBackup} accepts it. */
const importPayloadSchema = z.object({
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
	// API keys are never exported: they only decrypt under this server's ENCRYPTION_KEY.
	endpoints: z
		.array(
			z.object({
				name: z.string(),
				url: z.string(),
				provider: llmProviderSchema,
				options: samplingOptionsSchema.nullish(),
			}),
		)
		.optional(),
	modelSettings: z
		.array(
			z.object({
				endpointUrl: z.string(),
				endpointName: z.string().nullish(),
				provider: llmProviderSchema,
				model: z.string(),
				options: perModelOptionsSchema,
			}),
		)
		.optional(),
});

/** A backup file as {@link importBackup} accepts it. */
type ImportPayload = z.infer<typeof importPayloadSchema>;

/**
 * The minimum a transcript needs to load as `ModelMessage[]`. Unknown fields are kept;
 * a conversation that fails this is skipped and counted invalid.
 */
const transcriptSchema = z.array(
	z.looseObject({
		role: z.string(),
		content: z
			.union([z.string(), z.array(z.looseObject({ type: z.string() })), z.null()])
			.optional(),
	}),
);

/** A JSON backup of a user's memories, chats, chat defaults, endpoints, and model settings. */
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
			messages: messagesByThreadId.get(c.id) ?? [],
		})),
		endpoints,
		// Keyed by endpoint url and provider, so they reattach once the endpoints are recreated.
		modelSettings: modelSettings.map((setting) => ({
			endpointUrl: setting.endpoint.url,
			endpointName: setting.endpoint.name,
			provider: setting.endpoint.provider,
			model: setting.model,
			options: setting.options,
		})),
	};
}

/** `text` and `category` identify a memory. */
function memoryKey({ text, category }: { text: string; category: string }): string {
	return `${category}\u0000${text}`;
}

/** `title` and the serialized `messages` identify a conversation. */
function conversationKey({ title, messages }: { title: string; messages: unknown }): string {
	return `${title}\u0000${JSON.stringify(messages)}`;
}

/** `provider` and `url` identify an endpoint. */
function endpointKey({ url, provider }: { url: string; provider: string }): string {
	return `${provider} ${url}`;
}

/** `endpointId` and `model` identify a model setting. */
function modelSettingKey({ endpointId, model }: { endpointId: string; model: string }): string {
	return `${endpointId} ${model}`;
}

/**
 * Merges a backup into the account without overwriting anything: settings fill only unset
 * fields, and rows that already exist are skipped, so importing the same file twice changes nothing.
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

	const incomingEndpoints = (payload.endpoints ?? []).filter(
		(endpoint) => endpoint?.url && endpoint?.name,
	);
	const incomingModelSettings = (payload.modelSettings ?? []).filter(
		(setting) => setting?.model && setting?.endpointUrl,
	);

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
				// Endpoint ids differ per account, so the chat waits for a model to be picked.
				messages: JSON.parse(JSON.stringify(transcript.data)),
				ownerId: userId,
			},
		];
	});

	// Model settings can attach to existing endpoints, not just imported ones.
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
	const existingEndpointKeys = new Set(existingEndpoints.map(endpointKey));

	const memories = incomingMemories.filter((m) => !existingMemoryKeys.has(memoryKey(m)));
	const conversations = incomingConversations.filter(
		(c) => !existingConversationKeys.has(conversationKey(c)),
	);
	const endpointsToCreate = incomingEndpoints.filter(
		(e) => !existingEndpointKeys.has(endpointKey(e)),
	);

	// Network calls stay outside the transaction. A failed embedding stores a NULL vector.
	const memoryEmbeddings = await Promise.all(
		memories.map((memory) => embed({ text: memory.text, ownerId: userId })),
	);

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

		// Imported endpoints have no key; the user adds one in Settings.
		const endpointIdByKey = new Map(
			existingEndpoints.map((endpoint) => [endpointKey(endpoint), endpoint.id]),
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

		// One at a time, since each `ChatThread` needs its conversation's generated id.
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

// Large, since backups include image attachments as data URLs.
const MAX_IMPORT_BYTES = 256 * 1024 * 1024;

/** The user's backup as a JSON file download. */
export async function getBackupExport({
	userId,
	email,
}: {
	userId: string;
	email: string;
}): Promise<Response> {
	const payload = await exportBackup({ userId, email });
	const filename = `localghost-backup-${new Date().toISOString().slice(0, 10)}.json`;
	return new Response(JSON.stringify(payload, null, 2), {
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition": `attachment; filename="${filename}"`,
		},
	});
}

/** Reads an uploaded backup file and merges it into the user's data. */
export async function postBackupImport({
	request,
	userId,
}: {
	request: Request;
	userId: string;
}): Promise<Response> {
	let raw: unknown;
	try {
		raw = await readJsonWithLimit({ request, maxBytes: MAX_IMPORT_BYTES });
	} catch (err) {
		if (err instanceof BodyTooLargeError) return new Response(err.message, { status: 413 });
		return new Response("Invalid JSON", { status: 400 });
	}

	const parsed = importPayloadSchema.safeParse(raw);
	if (!parsed.success) return new Response("Invalid backup format", { status: 400 });
	if ((parsed.data.version ?? BACKUP_VERSION) > BACKUP_VERSION) {
		return new Response(
			`This backup is format version ${parsed.data.version}, newer than this app supports. Update the app, then import again.`,
			{ status: 400 },
		);
	}

	const imported = await importBackup({ userId, payload: parsed.data });
	return Response.json({ ok: true, imported });
}
