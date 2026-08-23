import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	exportBackup,
	importBackup,
	importPayloadSchema,
} from "#/routes/api/backup/-backup.server";

const {
	memoryFindMany,
	insertMemory,
	conversationFindMany,
	conversationCreate,
	chatThreadFindMany,
	chatThreadCreate,
	userFindUnique,
	userUpdate,
	endpointFindMany,
	endpointCreate,
	modelSettingFindMany,
	modelSettingCreate,
} = vi.hoisted(() => ({
	memoryFindMany: vi.fn(),
	insertMemory: vi.fn(),
	conversationFindMany: vi.fn(),
	conversationCreate: vi.fn(),
	chatThreadFindMany: vi.fn(),
	chatThreadCreate: vi.fn(),
	userFindUnique: vi.fn(),
	userUpdate: vi.fn(),
	endpointFindMany: vi.fn(),
	endpointCreate: vi.fn(),
	modelSettingFindMany: vi.fn(),
	modelSettingCreate: vi.fn(),
}));

vi.mock("#/shared/lib/db.server", () => {
	const tx = {
		user: { findUnique: userFindUnique, update: userUpdate },
		conversation: { create: conversationCreate },
		chatThread: { create: chatThreadCreate },
		endpoint: { create: endpointCreate },
		modelSetting: { create: modelSettingCreate },
	};
	return {
		prisma: {
			memory: { findMany: memoryFindMany },
			conversation: { findMany: conversationFindMany },
			chatThread: { findMany: chatThreadFindMany },
			user: { findUnique: userFindUnique, update: userUpdate },
			endpoint: { findMany: endpointFindMany },
			modelSetting: { findMany: modelSettingFindMany },
			$transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
		},
	};
});

vi.mock("#/shared/domain/memory/memory.server", () => ({ insertMemory }));

// The *FindMany mocks back both exportBackup's row select and importBackup's
// dedup lookups; each describe block below sets what it needs. `listModelSettings`
// runs against the same `modelSetting.findMany` mock (it's a thin prisma call).

beforeEach(() => {
	vi.clearAllMocks();
	memoryFindMany.mockResolvedValue([]);
	insertMemory.mockResolvedValue(undefined);
	conversationFindMany.mockResolvedValue([]);
	chatThreadFindMany.mockResolvedValue([]);
	conversationCreate.mockResolvedValue({ id: "c-new" });
	chatThreadCreate.mockResolvedValue(undefined);
	userFindUnique.mockResolvedValue(null);
	endpointFindMany.mockResolvedValue([]);
	endpointCreate.mockResolvedValue({ id: "ep-new" });
	modelSettingFindMany.mockResolvedValue([]);
	modelSettingCreate.mockResolvedValue({});
});

describe("exportBackup", () => {
	it("shapes memories, conversations, endpoints, model settings, and defaults from the user's rows", async () => {
		memoryFindMany.mockResolvedValue([{ text: "remember this", category: "fact", source: "chat" }]);
		conversationFindMany.mockResolvedValue([{ id: "c1", title: "Trip planning", model: "llama3" }]);
		chatThreadFindMany.mockResolvedValue([{ threadId: "c1", messages: [{ role: "user" }] }]);
		userFindUnique.mockResolvedValue({ systemPrompt: "be terse", temperature: 0.5 });
		endpointFindMany.mockResolvedValue([
			{ name: "OpenAI", url: "https://api.openai.com", provider: "openai", options: null },
		]);
		modelSettingFindMany.mockResolvedValue([
			{
				model: "gpt-4o",
				options: { max_tokens: 8192 },
				endpoint: { url: "https://api.openai.com", name: "OpenAI", provider: "openai" },
			},
		]);

		const backup = await exportBackup({ userId: "user-1", email: "a@b.com" });

		expect(backup).toEqual({
			version: 4,
			exportedAt: expect.any(String),
			exportedBy: "a@b.com",
			userSettings: { systemPrompt: "be terse", temperature: 0.5 },
			memories: [{ text: "remember this", category: "fact", source: "chat" }],
			conversations: [{ title: "Trip planning", model: "llama3", messages: [{ role: "user" }] }],
			endpoints: [
				{ name: "OpenAI", url: "https://api.openai.com", provider: "openai", options: null },
			],
			modelSettings: [
				{
					endpointUrl: "https://api.openai.com",
					endpointName: "OpenAI",
					provider: "openai",
					model: "gpt-4o",
					options: { max_tokens: 8192 },
				},
			],
		});
	});

	it("never includes an encrypted API key in an exported endpoint", async () => {
		endpointFindMany.mockResolvedValue([
			{
				name: "Custom",
				url: "https://api.test",
				provider: "openai",
				options: null,
				apiKeyEncrypted: "secret-ciphertext",
			},
		]);

		const backup = await exportBackup({ userId: "user-1", email: "a@b.com" });

		expect(backup.endpoints).toEqual([
			{ name: "Custom", url: "https://api.test", provider: "openai", options: null },
		]);
		expect(JSON.stringify(backup)).not.toContain("secret-ciphertext");
	});

	it("exports legacy Ollama endpoints as OpenAI-compatible endpoints", async () => {
		endpointFindMany.mockResolvedValue([
			{ name: "Ollama", url: "http://localhost:11434/", provider: "ollama", options: null },
		]);
		modelSettingFindMany.mockResolvedValue([
			{
				model: "llama3",
				options: {},
				endpoint: {
					url: "http://localhost:11434/",
					name: "Ollama",
					provider: "ollama",
				},
			},
		]);

		const backup = await exportBackup({ userId: "user-1", email: "a@b.com" });

		expect(backup.endpoints).toEqual([
			{
				name: "Ollama",
				url: "http://localhost:11434/v1",
				provider: "openai",
				options: null,
			},
		]);
		expect(backup.modelSettings).toEqual([
			{
				endpointUrl: "http://localhost:11434/v1",
				endpointName: "Ollama",
				provider: "openai",
				model: "llama3",
				options: {},
			},
		]);
	});

	it("reports null userSettings when the user row is gone", async () => {
		memoryFindMany.mockResolvedValue([]);
		conversationFindMany.mockResolvedValue([]);
		userFindUnique.mockResolvedValue(null);

		const backup = await exportBackup({ userId: "user-1", email: "a@b.com" });
		expect(backup.userSettings).toBeNull();
	});
});

describe("importBackup: user settings merge", () => {
	it("keeps the user's existing settings over the imported ones", async () => {
		userFindUnique.mockResolvedValue({ systemPrompt: "mine", temperature: 0.2 });

		await importBackup({
			userId: "user-1",
			payload: { userSettings: { systemPrompt: "theirs", temperature: 0.9 } },
		});

		expect(userUpdate).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: { systemPrompt: "mine", temperature: 0.2 },
		});
	});

	it("fills unset fields from the import and defaults the rest to null", async () => {
		userFindUnique.mockResolvedValue({ systemPrompt: null, temperature: null });

		await importBackup({ userId: "user-1", payload: { userSettings: { systemPrompt: "theirs" } } });

		expect(userUpdate).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: { systemPrompt: "theirs", temperature: null },
		});
	});

	it("treats a missing existing user row as all-unset", async () => {
		userFindUnique.mockResolvedValue(null);

		await importBackup({ userId: "user-1", payload: { userSettings: { temperature: 0.5 } } });

		expect(userUpdate).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: { systemPrompt: null, temperature: 0.5 },
		});
	});

	it("skips the settings update entirely when the payload has none", async () => {
		await importBackup({ userId: "user-1", payload: {} });
		expect(userUpdate).not.toHaveBeenCalled();
	});
});

describe("importBackup: memories", () => {
	it("drops empty-text memories and inserts the rest", async () => {
		await importBackup({
			userId: "owner-1",
			payload: {
				memories: [
					{ text: "remember this" },
					{ text: "", category: "x" },
					{ text: "curated", category: "note", source: "manual" },
				],
			},
		});

		expect(insertMemory).toHaveBeenCalledTimes(2);
		expect(insertMemory).toHaveBeenCalledWith({
			db: expect.anything(),
			ownerId: "owner-1",
			text: "remember this",
			category: "fact",
			source: "import",
			embedding: null,
		});
		expect(insertMemory).toHaveBeenCalledWith({
			db: expect.anything(),
			ownerId: "owner-1",
			text: "curated",
			category: "note",
			source: "manual",
			embedding: null,
		});
	});

	it("saves nothing when the payload has no memories", async () => {
		const result = await importBackup({ userId: "o", payload: {} });
		expect(insertMemory).not.toHaveBeenCalled();
		expect(result.memories).toBe(0);
	});

	it("skips memories that already exist for the owner (re-import is a no-op)", async () => {
		memoryFindMany.mockResolvedValue([{ text: "already saved", category: "fact" }]);

		const result = await importBackup({
			userId: "owner-1",
			payload: {
				memories: [{ text: "already saved", category: "fact" }, { text: "new one" }],
			},
		});

		expect(insertMemory).toHaveBeenCalledTimes(1);
		expect(insertMemory).toHaveBeenCalledWith({
			db: expect.anything(),
			ownerId: "owner-1",
			text: "new one",
			category: "fact",
			source: "import",
			embedding: null,
		});
		expect(result).toMatchObject({ memories: 1, skippedMemories: 1 });
	});
});

describe("importBackup: conversations", () => {
	it("defaults title and model, creates a matching ChatThread with the messages blob", async () => {
		conversationCreate.mockResolvedValue({ id: "c-new" });

		await importBackup({
			userId: "owner-1",
			payload: { conversations: [{ messages: [{ role: "user", content: "hi" }] }] },
		});

		expect(conversationCreate).toHaveBeenCalledWith({
			data: { title: "Imported chat", model: "", ownerId: "owner-1" },
			select: { id: true },
		});
		expect(chatThreadCreate).toHaveBeenCalledWith({
			data: { threadId: "c-new", messages: [{ role: "user", content: "hi" }] },
		});
	});

	it("keeps a provided title and model", async () => {
		conversationCreate.mockResolvedValue({ id: "c-new" });

		await importBackup({
			userId: "o",
			payload: { conversations: [{ title: "Trip", model: "llama3", messages: [] }] },
		});

		expect(conversationCreate).toHaveBeenCalledWith({
			data: { title: "Trip", model: "llama3", ownerId: "o" },
			select: { id: true },
		});
	});

	it("skips conversations already present by title and message content", async () => {
		const trip = [{ role: "user", content: "hi" }];
		const fresh = [{ role: "user", content: "yo" }];
		conversationFindMany.mockResolvedValue([{ id: "c1", title: "Trip" }]);
		chatThreadFindMany.mockResolvedValue([{ threadId: "c1", messages: trip }]);
		conversationCreate.mockResolvedValue({ id: "c-new" });

		const result = await importBackup({
			userId: "owner-1",
			payload: {
				conversations: [
					{ title: "Trip", model: "llama3", messages: trip },
					{ title: "New chat", model: "llama3", messages: fresh },
				],
			},
		});

		expect(conversationCreate).toHaveBeenCalledTimes(1);
		expect(conversationCreate).toHaveBeenCalledWith({
			data: { title: "New chat", model: "llama3", ownerId: "owner-1" },
			select: { id: true },
		});
		expect(result).toMatchObject({ conversations: 1, skippedConversations: 1 });
	});

	it("counts and skips conversations whose transcript isn't ModelMessage-shaped", async () => {
		const valid = [{ role: "user", content: "hi" }];
		conversationCreate.mockResolvedValue({ id: "c-new" });

		const result = await importBackup({
			userId: "owner-1",
			payload: {
				conversations: [
					{ title: "Broken", messages: [{ note: "not a message" }] },
					{ title: "Also broken", messages: "garbage" },
					{ title: "Fine", messages: valid },
				],
			},
		});

		expect(conversationCreate).toHaveBeenCalledTimes(1);
		expect(conversationCreate).toHaveBeenCalledWith({
			data: { title: "Fine", model: "", ownerId: "owner-1" },
			select: { id: true },
		});
		expect(chatThreadCreate).toHaveBeenCalledWith({ data: { threadId: "c-new", messages: valid } });
		expect(result).toMatchObject({ invalidConversations: 2, skippedConversations: 0 });
	});
});

describe("importBackup: endpoints", () => {
	it("creates a missing endpoint with no API key (flagged for re-entry) and no options key when absent", async () => {
		const result = await importBackup({
			userId: "owner-1",
			payload: {
				endpoints: [{ name: "OpenAI", url: "https://api.openai.com", provider: "openai" }],
			},
		});

		expect(endpointCreate).toHaveBeenCalledWith({
			data: {
				name: "OpenAI",
				url: "https://api.openai.com",
				provider: "openai",
				ownerId: "owner-1",
			},
			select: { id: true },
		});
		expect(result).toMatchObject({ endpoints: 1, skippedEndpoints: 0 });
	});

	it("skips an endpoint already present by url and provider", async () => {
		endpointFindMany.mockResolvedValue([
			{ id: "ep-1", url: "https://api.openai.com", provider: "openai" },
		]);

		const result = await importBackup({
			userId: "owner-1",
			payload: {
				endpoints: [{ name: "OpenAI", url: "https://api.openai.com", provider: "openai" }],
			},
		});

		expect(endpointCreate).not.toHaveBeenCalled();
		expect(result).toMatchObject({ endpoints: 0, skippedEndpoints: 1 });
	});

	it("normalizes legacy Ollama endpoints and model settings before import", async () => {
		const payload = importPayloadSchema.parse({
			endpoints: [{ name: "Ollama", url: "http://localhost:11434/", provider: "ollama" }],
			modelSettings: [
				{
					endpointUrl: "http://localhost:11434/v1",
					provider: "ollama",
					model: "llama3",
					options: {},
				},
			],
		});

		const result = await importBackup({ userId: "owner-1", payload });

		expect(endpointCreate).toHaveBeenCalledWith({
			data: {
				name: "Ollama",
				url: "http://localhost:11434/v1",
				provider: "openai",
				ownerId: "owner-1",
			},
			select: { id: true },
		});
		expect(modelSettingCreate).toHaveBeenCalledWith({
			data: {
				endpointId: "ep-new",
				model: "llama3",
				options: {},
				ownerId: "owner-1",
			},
		});
		expect(result).toMatchObject({ endpoints: 1, modelSettings: 1 });
	});

	it("matches a legacy Ollama endpoint through its normalized identity", async () => {
		endpointFindMany.mockResolvedValue([
			{ id: "ep-old", url: "http://localhost:11434", provider: "ollama" },
		]);

		const result = await importBackup({
			userId: "owner-1",
			payload: {
				endpoints: [{ name: "Ollama", url: "http://localhost:11434/", provider: "ollama" }],
			},
		});

		expect(endpointCreate).not.toHaveBeenCalled();
		expect(result).toMatchObject({ endpoints: 0, skippedEndpoints: 1 });
	});
});

describe("importBackup: model settings", () => {
	it("re-attaches a model setting to an existing endpoint matched by url and provider", async () => {
		endpointFindMany.mockResolvedValue([
			{ id: "ep-1", url: "https://api.openai.com", provider: "openai" },
		]);

		const result = await importBackup({
			userId: "owner-1",
			payload: {
				modelSettings: [
					{
						endpointUrl: "https://api.openai.com",
						provider: "openai",
						model: "gpt-4o",
						options: { max_tokens: 8192 },
					},
				],
			},
		});

		expect(modelSettingCreate).toHaveBeenCalledWith({
			data: {
				endpointId: "ep-1",
				model: "gpt-4o",
				options: { max_tokens: 8192 },
				ownerId: "owner-1",
			},
		});
		expect(result).toMatchObject({ modelSettings: 1, skippedModelSettings: 0 });
	});

	it("attaches a model setting to a newly created endpoint from the same import", async () => {
		endpointCreate.mockResolvedValue({ id: "ep-fresh" });

		const result = await importBackup({
			userId: "owner-1",
			payload: {
				endpoints: [{ name: "Local", url: "http://localhost:8080", provider: "llamacpp" }],
				modelSettings: [
					{
						endpointUrl: "http://localhost:8080",
						provider: "llamacpp",
						model: "llama3",
						options: { max_tokens: 4096 },
					},
				],
			},
		});

		expect(modelSettingCreate).toHaveBeenCalledWith({
			data: {
				endpointId: "ep-fresh",
				model: "llama3",
				options: { max_tokens: 4096 },
				ownerId: "owner-1",
			},
		});
		expect(result).toMatchObject({ endpoints: 1, modelSettings: 1 });
	});

	it("skips a model setting whose endpoint can't be resolved", async () => {
		const result = await importBackup({
			userId: "owner-1",
			payload: {
				modelSettings: [
					{
						endpointUrl: "https://unknown.test",
						provider: "openai",
						model: "gpt-4o",
						options: {},
					},
				],
			},
		});

		expect(modelSettingCreate).not.toHaveBeenCalled();
		expect(result).toMatchObject({ modelSettings: 0, skippedModelSettings: 1 });
	});

	it("skips a model setting already present for that endpoint and model", async () => {
		endpointFindMany.mockResolvedValue([
			{ id: "ep-1", url: "https://api.openai.com", provider: "openai" },
		]);
		modelSettingFindMany.mockResolvedValue([{ endpointId: "ep-1", model: "gpt-4o" }]);

		const result = await importBackup({
			userId: "owner-1",
			payload: {
				modelSettings: [
					{
						endpointUrl: "https://api.openai.com",
						provider: "openai",
						model: "gpt-4o",
						options: { max_tokens: 8192 },
					},
				],
			},
		});

		expect(modelSettingCreate).not.toHaveBeenCalled();
		expect(result).toMatchObject({ modelSettings: 0, skippedModelSettings: 1 });
	});
});
