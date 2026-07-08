import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportBackup, importBackup } from "#/shared/lib/backup.server";

const {
	memoryFindMany,
	memoryCreateMany,
	conversationFindMany,
	conversationCreateMany,
	userFindUnique,
	userUpdate,
} = vi.hoisted(() => ({
	memoryFindMany: vi.fn(),
	memoryCreateMany: vi.fn(),
	conversationFindMany: vi.fn(),
	conversationCreateMany: vi.fn(),
	userFindUnique: vi.fn(),
	userUpdate: vi.fn(),
}));

vi.mock("#/shared/lib/db.server", () => ({
	prisma: {
		memory: { findMany: memoryFindMany, createMany: memoryCreateMany },
		conversation: { findMany: conversationFindMany, createMany: conversationCreateMany },
		user: { findUnique: userFindUnique, update: userUpdate },
	},
}));

beforeEach(() => {
	vi.clearAllMocks();
	memoryFindMany.mockResolvedValue([]);
	memoryCreateMany.mockResolvedValue({ count: 0 });
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
	it("drops empty-text memories and defaults category and source", async () => {
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

		expect(memoryCreateMany).toHaveBeenCalledWith({
			data: [
				{ text: "remember this", category: "fact", source: "import", ownerId: "owner-1" },
				{ text: "curated", category: "note", source: "manual", ownerId: "owner-1" },
			],
		});
	});

	it("skips the insert entirely when the payload has no memories", async () => {
		const result = await importBackup({ userId: "o", payload: {} });
		expect(memoryCreateMany).not.toHaveBeenCalled();
		expect(result.memories).toBe(0);
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
});
