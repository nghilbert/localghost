import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportBackup, importBackup } from "#/routes/api/backup/-backup.server";

const {
	memoryFindMany,
	insertMemory,
	embed,
	conversationFindMany,
	conversationCreateMany,
	userFindUnique,
	userUpdate,
} = vi.hoisted(() => ({
	memoryFindMany: vi.fn(),
	insertMemory: vi.fn(),
	embed: vi.fn(),
	conversationFindMany: vi.fn(),
	conversationCreateMany: vi.fn(),
	userFindUnique: vi.fn(),
	userUpdate: vi.fn(),
}));

vi.mock("#/shared/lib/db.server", () => {
	const tx = {
		user: { findUnique: userFindUnique, update: userUpdate },
		conversation: { createMany: conversationCreateMany },
	};
	return {
		prisma: {
			memory: { findMany: memoryFindMany },
			conversation: { findMany: conversationFindMany, createMany: conversationCreateMany },
			user: { findUnique: userFindUnique, update: userUpdate },
			$transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
		},
	};
});

vi.mock("#/shared/domain/memory/memory.server", () => ({ insertMemory }));
vi.mock("#/shared/domain/memory/embeddings.server", () => ({ embed }));

// `memoryFindMany`/`conversationFindMany` back both exportBackup's row select
// and importBackup's dedup lookup; each describe block below sets what it needs.

beforeEach(() => {
	vi.clearAllMocks();
	memoryFindMany.mockResolvedValue([]);
	insertMemory.mockResolvedValue(undefined);
	embed.mockResolvedValue(null);
	conversationFindMany.mockResolvedValue([]);
	conversationCreateMany.mockResolvedValue({ count: 0 });
	userFindUnique.mockResolvedValue(null);
});

describe("exportBackup", () => {
	it("shapes memories, conversations, and settings from the current user's rows", async () => {
		memoryFindMany.mockResolvedValue([{ text: "remember this", category: "fact", source: "chat" }]);
		conversationFindMany.mockResolvedValue([
			{ title: "Trip planning", model: "llama3", messages: [{ id: "m1" }] },
		]);
		userFindUnique.mockResolvedValue({ systemPrompt: "be terse", temperature: 0.5 });

		const backup = await exportBackup({ userId: "user-1", email: "a@b.com" });

		expect(backup).toEqual({
			version: 2,
			exportedAt: expect.any(String),
			exportedBy: "a@b.com",
			userSettings: { systemPrompt: "be terse", temperature: 0.5 },
			memories: [{ text: "remember this", category: "fact", source: "chat" }],
			conversations: [{ title: "Trip planning", model: "llama3", messages: [{ id: "m1" }] }],
		});
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
	it("drops empty-text memories and inserts the rest with their embedding", async () => {
		embed.mockImplementation(({ text }: { text: string }) =>
			Promise.resolve(text === "remember this" ? [0.1] : [0.2]),
		);

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
			embedding: [0.1],
		});
		expect(insertMemory).toHaveBeenCalledWith({
			db: expect.anything(),
			ownerId: "owner-1",
			text: "curated",
			category: "note",
			source: "manual",
			embedding: [0.2],
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
	it("defaults title and model and round-trips the messages blob", async () => {
		await importBackup({
			userId: "owner-1",
			payload: { conversations: [{ messages: [{ id: "m1", role: "user", parts: [] }] }] },
		});

		expect(conversationCreateMany).toHaveBeenCalledWith({
			data: [
				{
					title: "Imported chat",
					model: "",
					messages: [{ id: "m1", role: "user", parts: [] }],
					ownerId: "owner-1",
				},
			],
		});
	});

	it("keeps a provided title and model", async () => {
		await importBackup({
			userId: "o",
			payload: { conversations: [{ title: "Trip", model: "llama3", messages: [] }] },
		});

		expect(conversationCreateMany).toHaveBeenCalledWith({
			data: [{ title: "Trip", model: "llama3", messages: [], ownerId: "o" }],
		});
	});

	it("skips conversations already present by title and message content", async () => {
		const trip = [{ id: "m1", role: "user", parts: [{ type: "text", content: "hi" }] }];
		const fresh = [{ id: "m2", role: "user", parts: [{ type: "text", content: "yo" }] }];
		conversationFindMany.mockResolvedValue([{ title: "Trip", messages: trip }]);
		conversationCreateMany.mockResolvedValue({ count: 1 });

		const result = await importBackup({
			userId: "owner-1",
			payload: {
				conversations: [
					{ title: "Trip", model: "llama3", messages: trip },
					{ title: "New chat", model: "llama3", messages: fresh },
				],
			},
		});

		expect(conversationCreateMany).toHaveBeenCalledWith({
			data: [{ title: "New chat", model: "llama3", messages: fresh, ownerId: "owner-1" }],
		});
		expect(result).toMatchObject({ conversations: 1, skippedConversations: 1 });
	});

	it("counts and skips conversations whose transcript isn't UIMessage-shaped", async () => {
		const valid = [{ id: "m1", role: "user", parts: [] }];

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

		expect(conversationCreateMany).toHaveBeenCalledWith({
			data: [{ title: "Fine", model: "", messages: valid, ownerId: "owner-1" }],
		});
		expect(result).toMatchObject({ invalidConversations: 2, skippedConversations: 0 });
	});
});
