import { beforeEach, describe, expect, it, vi } from "vitest";

const { saveMemory, recallMemories, findMemories, removeMemory } = vi.hoisted(() => ({
	saveMemory: vi.fn(),
	recallMemories: vi.fn(),
	findMemories: vi.fn(),
	removeMemory: vi.fn(),
}));

vi.mock("#/shared/domain/memory/memory.server", () => ({
	saveMemory,
	recallMemories,
	findMemories,
	removeMemory,
}));

import { manageMemory } from "#/shared/domain/memory/memory-tool.server";

const ownerId = "owner-1";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("manageMemory: add", () => {
	it("requires non-blank text", async () => {
		expect(await manageMemory({ args: { action: "add" }, ownerId })).toBe(
			"text is required to add a memory",
		);
		expect(await manageMemory({ args: { action: "add", text: "  " }, ownerId })).toBe(
			"text is required to add a memory",
		);
		expect(saveMemory).not.toHaveBeenCalled();
	});

	it("saves with the given category and confirms without truncation at exactly 80 chars", async () => {
		const text = "a".repeat(80);
		const result = await manageMemory({ args: { action: "add", text, category: "fact" }, ownerId });

		expect(saveMemory).toHaveBeenCalledWith({ ownerId, text, category: "fact" });
		expect(result).toBe(`Memory saved: "${text}"`);
	});

	it("truncates the confirmation at 80 chars with an ellipsis for longer text", async () => {
		const text = "a".repeat(81);
		const result = await manageMemory({ args: { action: "add", text }, ownerId });

		expect(result).toBe(`Memory saved: "${"a".repeat(80)}…"`);
	});
});

describe("manageMemory: search", () => {
	it("requires a non-blank query", async () => {
		expect(await manageMemory({ args: { action: "search" }, ownerId })).toBe(
			"query is required to search memories",
		);
		expect(await manageMemory({ args: { action: "search", query: "  " }, ownerId })).toBe(
			"query is required to search memories",
		);
		expect(recallMemories).not.toHaveBeenCalled();
	});

	it("reports no matches", async () => {
		recallMemories.mockResolvedValue([]);
		expect(await manageMemory({ args: { action: "search", query: "coffee" }, ownerId })).toBe(
			"No matching memories found.",
		);
	});

	it("defaults the limit to 5 and formats each row", async () => {
		recallMemories.mockResolvedValue([
			{ id: "m1", category: "fact", text: "likes coffee" },
			{ id: "m2", category: "pref", text: "dark mode" },
		]);

		const result = await manageMemory({ args: { action: "search", query: "coffee" }, ownerId });

		expect(recallMemories).toHaveBeenCalledWith({ ownerId, query: "coffee", limit: 5 });
		expect(result).toBe("[m1] (fact) likes coffee\n[m2] (pref) dark mode");
	});

	it("forwards a given limit", async () => {
		recallMemories.mockResolvedValue([]);
		await manageMemory({ args: { action: "search", query: "coffee", limit: 20 }, ownerId });
		expect(recallMemories).toHaveBeenCalledWith({ ownerId, query: "coffee", limit: 20 });
	});
});

describe("manageMemory: list", () => {
	it("reports no memories", async () => {
		findMemories.mockResolvedValue([]);
		expect(await manageMemory({ args: { action: "list" }, ownerId })).toBe(
			"No memories saved yet.",
		);
	});

	it("defaults the limit to 10", async () => {
		findMemories.mockResolvedValue([]);
		await manageMemory({ args: { action: "list" }, ownerId });
		expect(findMemories).toHaveBeenCalledWith({ ownerId, limit: 10 });
	});

	it("clamps a given limit to 50", async () => {
		findMemories.mockResolvedValue([]);
		await manageMemory({ args: { action: "list", limit: 500 }, ownerId });
		expect(findMemories).toHaveBeenCalledWith({ ownerId, limit: 50 });
	});

	it("formats each row", async () => {
		findMemories.mockResolvedValue([{ id: "m1", category: "fact", text: "likes coffee" }]);
		expect(await manageMemory({ args: { action: "list" }, ownerId })).toBe(
			"[m1] (fact) likes coffee",
		);
	});
});

describe("manageMemory: delete", () => {
	it("requires an id", async () => {
		expect(await manageMemory({ args: { action: "delete" }, ownerId })).toBe(
			"id is required to delete a memory",
		);
		expect(removeMemory).not.toHaveBeenCalled();
	});

	it("confirms deletion when the memory existed", async () => {
		removeMemory.mockResolvedValue(true);
		const result = await manageMemory({ args: { action: "delete", id: "m1" }, ownerId });
		expect(removeMemory).toHaveBeenCalledWith({ id: "m1", ownerId });
		expect(result).toBe("Memory deleted.");
	});

	it("reports when the memory wasn't found", async () => {
		removeMemory.mockResolvedValue(false);
		expect(await manageMemory({ args: { action: "delete", id: "m1" }, ownerId })).toBe(
			"Memory not found.",
		);
	});
});
