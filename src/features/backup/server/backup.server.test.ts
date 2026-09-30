import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { encrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { createConversation, createEndpoint, createUser, resetDb } from "#/test/db.server";
import { exportBackup, importBackup } from "./backup.server";

beforeEach(resetDb);

describe("exportBackup", () => {
	it("shapes memories, conversations, endpoints, model settings, and defaults from the user's rows", async () => {
		const user = await createUser({ systemPrompt: "be terse", temperature: 0.5 });
		await prisma.memory.create({
			data: { text: "remember this", category: "fact", source: "chat", ownerId: user.id },
		});
		const conversation = await createConversation({
			ownerId: user.id,
			title: "Trip planning",
			model: "llama3",
		});
		await prisma.chatThread.create({
			data: { threadId: conversation.id, messages: [{ role: "user" }] },
		});
		const endpoint = await createEndpoint({
			ownerId: user.id,
			name: "OpenAI",
			url: "https://api.openai.com",
			provider: "openai",
		});
		await prisma.modelSetting.create({
			data: {
				endpointId: endpoint.id,
				model: "gpt-4o",
				options: { max_tokens: 8192 },
				ownerId: user.id,
			},
		});

		const backup = await exportBackup({ userId: user.id, email: "a@b.com" });

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
		const user = await createUser();
		await createEndpoint({
			ownerId: user.id,
			name: "Custom",
			url: "https://api.test",
			provider: "openai",
			apiKeyEncrypted: encrypt("super-secret-key"),
		});

		const backup = await exportBackup({ userId: user.id, email: "a@b.com" });

		expect(backup.endpoints).toEqual([
			{ name: "Custom", url: "https://api.test", provider: "openai", options: null },
		]);
		expect(backup.endpoints[0]).not.toHaveProperty("apiKeyEncrypted");
	});

	it("reports null userSettings when the user row is gone", async () => {
		const backup = await exportBackup({ userId: randomUUID(), email: "a@b.com" });
		expect(backup.userSettings).toBeNull();
		expect(backup.memories).toEqual([]);
		expect(backup.conversations).toEqual([]);
	});
});

describe("importBackup: user settings merge", () => {
	it("keeps the user's existing settings over the imported ones", async () => {
		const user = await createUser({ systemPrompt: "mine", temperature: 0.2 });

		await importBackup({
			userId: user.id,
			payload: { userSettings: { systemPrompt: "theirs", temperature: 0.9 } },
		});

		const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(updated).toMatchObject({ systemPrompt: "mine", temperature: 0.2 });
	});

	it("fills unset fields from the import and defaults the rest to null", async () => {
		const user = await createUser({ systemPrompt: null, temperature: null });

		await importBackup({ userId: user.id, payload: { userSettings: { systemPrompt: "theirs" } } });

		const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(updated).toMatchObject({ systemPrompt: "theirs", temperature: null });
	});

	it("defaults to null a field the import doesn't provide, even when the other is filled", async () => {
		const user = await createUser({ systemPrompt: null, temperature: null });

		await importBackup({ userId: user.id, payload: { userSettings: { temperature: 0.5 } } });

		const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(updated).toMatchObject({ systemPrompt: null, temperature: 0.5 });
	});

	it("skips the settings update entirely when the payload has none", async () => {
		const user = await createUser({ systemPrompt: "kept" });

		await importBackup({ userId: user.id, payload: {} });

		const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(unchanged.systemPrompt).toBe("kept");
		expect(unchanged.updatedAt).toEqual(user.updatedAt);
	});
});

describe("importBackup: memories", () => {
	it("drops empty-text memories and inserts the rest", async () => {
		const user = await createUser();

		await importBackup({
			userId: user.id,
			payload: {
				memories: [
					{ text: "remember this" },
					{ text: "", category: "x" },
					{ text: "curated", category: "note", source: "manual" },
				],
			},
		});

		const memories = await prisma.memory.findMany({
			where: { ownerId: user.id },
			orderBy: { text: "asc" },
			select: { text: true, category: true, source: true },
		});
		expect(memories).toEqual([
			{ text: "curated", category: "note", source: "manual" },
			{ text: "remember this", category: "fact", source: "import" },
		]);
	});

	it("saves nothing when the payload has no memories", async () => {
		const user = await createUser();

		const result = await importBackup({ userId: user.id, payload: {} });

		expect(result.memories).toBe(0);
		expect(await prisma.memory.count({ where: { ownerId: user.id } })).toBe(0);
	});

	it("skips memories that already exist for the owner (re-import is a no-op)", async () => {
		const user = await createUser();
		await prisma.memory.create({
			data: { text: "already saved", category: "fact", source: "user", ownerId: user.id },
		});

		const result = await importBackup({
			userId: user.id,
			payload: {
				memories: [{ text: "already saved", category: "fact" }, { text: "new one" }],
			},
		});

		expect(result).toMatchObject({ memories: 1, skippedMemories: 1 });
		const texts = (await prisma.memory.findMany({ where: { ownerId: user.id } })).map(
			(m) => m.text,
		);
		expect(texts.sort()).toEqual(["already saved", "new one"]);
	});
});

describe("importBackup: conversations", () => {
	it("defaults title and model, creates a matching ChatThread with the messages blob", async () => {
		const user = await createUser();

		await importBackup({
			userId: user.id,
			payload: { conversations: [{ messages: [{ role: "user", content: "hi" }] }] },
		});

		const conversation = await prisma.conversation.findFirstOrThrow({
			where: { ownerId: user.id },
		});
		expect(conversation).toMatchObject({ title: "Imported chat", model: "" });
		const thread = await prisma.chatThread.findUniqueOrThrow({
			where: { threadId: conversation.id },
		});
		expect(thread.messages).toEqual([{ role: "user", content: "hi" }]);
	});

	it("keeps a provided title and model", async () => {
		const user = await createUser();

		await importBackup({
			userId: user.id,
			payload: { conversations: [{ title: "Trip", model: "llama3", messages: [] }] },
		});

		const conversation = await prisma.conversation.findFirstOrThrow({
			where: { ownerId: user.id },
		});
		expect(conversation).toMatchObject({ title: "Trip", model: "llama3" });
	});

	it("skips conversations already present by title and message content", async () => {
		const user = await createUser();
		const trip = [{ role: "user", content: "hi" }];
		const fresh = [{ role: "user", content: "yo" }];
		const existing = await createConversation({ ownerId: user.id, title: "Trip" });
		await prisma.chatThread.create({ data: { threadId: existing.id, messages: trip } });

		const result = await importBackup({
			userId: user.id,
			payload: {
				conversations: [
					{ title: "Trip", model: "llama3", messages: trip },
					{ title: "New chat", model: "llama3", messages: fresh },
				],
			},
		});

		expect(result).toMatchObject({ conversations: 1, skippedConversations: 1 });
		expect(await prisma.conversation.count({ where: { ownerId: user.id } })).toBe(2);
		const created = await prisma.conversation.findFirstOrThrow({
			where: { ownerId: user.id, title: "New chat" },
		});
		const thread = await prisma.chatThread.findUniqueOrThrow({
			where: { threadId: created.id },
		});
		expect(thread.messages).toEqual(fresh);
	});

	it("counts and skips conversations whose transcript isn't ModelMessage-shaped", async () => {
		const user = await createUser();
		const valid = [{ role: "user", content: "hi" }];

		const result = await importBackup({
			userId: user.id,
			payload: {
				conversations: [
					{ title: "Broken", messages: [{ note: "not a message" }] },
					{ title: "Also broken", messages: "garbage" },
					{ title: "Fine", messages: valid },
				],
			},
		});

		expect(result).toMatchObject({ invalidConversations: 2, skippedConversations: 0 });
		expect(await prisma.conversation.count({ where: { ownerId: user.id } })).toBe(1);
		const created = await prisma.conversation.findFirstOrThrow({ where: { ownerId: user.id } });
		expect(created.title).toBe("Fine");
		const thread = await prisma.chatThread.findUniqueOrThrow({ where: { threadId: created.id } });
		expect(thread.messages).toEqual(valid);
	});
});

describe("importBackup: endpoints", () => {
	it("creates a missing endpoint with no API key (flagged for re-entry) and no options key when absent", async () => {
		const user = await createUser();

		const result = await importBackup({
			userId: user.id,
			payload: {
				endpoints: [{ name: "OpenAI", url: "https://api.openai.com", provider: "openai" }],
			},
		});

		expect(result).toMatchObject({ endpoints: 1, skippedEndpoints: 0 });
		const created = await prisma.endpoint.findFirstOrThrow({ where: { ownerId: user.id } });
		expect(created).toMatchObject({
			name: "OpenAI",
			url: "https://api.openai.com",
			provider: "openai",
			apiKeyEncrypted: null,
			options: null,
		});
	});

	it("skips an endpoint already present by url and provider", async () => {
		const user = await createUser();
		await createEndpoint({ ownerId: user.id, url: "https://api.openai.com", provider: "openai" });

		const result = await importBackup({
			userId: user.id,
			payload: {
				endpoints: [{ name: "OpenAI", url: "https://api.openai.com", provider: "openai" }],
			},
		});

		expect(result).toMatchObject({ endpoints: 0, skippedEndpoints: 1 });
		expect(await prisma.endpoint.count({ where: { ownerId: user.id } })).toBe(1);
	});
});

describe("importBackup: model settings", () => {
	it("re-attaches a model setting to an existing endpoint matched by url and provider", async () => {
		const user = await createUser();
		const endpoint = await createEndpoint({
			ownerId: user.id,
			url: "https://api.openai.com",
			provider: "openai",
		});

		const result = await importBackup({
			userId: user.id,
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

		expect(result).toMatchObject({ modelSettings: 1, skippedModelSettings: 0 });
		const setting = await prisma.modelSetting.findFirstOrThrow({ where: { ownerId: user.id } });
		expect(setting).toMatchObject({
			endpointId: endpoint.id,
			model: "gpt-4o",
			options: { max_tokens: 8192 },
		});
	});

	it("attaches a model setting to a newly created endpoint from the same import", async () => {
		const user = await createUser();

		const result = await importBackup({
			userId: user.id,
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

		expect(result).toMatchObject({ endpoints: 1, modelSettings: 1 });
		const endpoint = await prisma.endpoint.findFirstOrThrow({ where: { ownerId: user.id } });
		const setting = await prisma.modelSetting.findFirstOrThrow({ where: { ownerId: user.id } });
		expect(setting).toMatchObject({
			endpointId: endpoint.id,
			model: "llama3",
			options: { max_tokens: 4096 },
		});
	});

	it("skips a model setting whose endpoint can't be resolved", async () => {
		const user = await createUser();

		const result = await importBackup({
			userId: user.id,
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

		expect(result).toMatchObject({ modelSettings: 0, skippedModelSettings: 1 });
		expect(await prisma.modelSetting.count({ where: { ownerId: user.id } })).toBe(0);
	});

	it("skips a model setting already present for that endpoint and model", async () => {
		const user = await createUser();
		const endpoint = await createEndpoint({
			ownerId: user.id,
			url: "https://api.openai.com",
			provider: "openai",
		});
		await prisma.modelSetting.create({
			data: { endpointId: endpoint.id, model: "gpt-4o", options: {}, ownerId: user.id },
		});

		const result = await importBackup({
			userId: user.id,
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

		expect(result).toMatchObject({ modelSettings: 0, skippedModelSettings: 1 });
		expect(await prisma.modelSetting.count({ where: { ownerId: user.id } })).toBe(1);
	});
});
