import { convertSchemaToJsonSchema } from "@tanstack/ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { recallMemories } = vi.hoisted(() => ({ recallMemories: vi.fn() }));

vi.mock("#/shared/domain/memory/memory.server", () => ({
	recallMemories,
	findMemories: vi.fn(),
}));

import { memoryAdapter } from "#/shared/domain/memory/memory-adapter.server";

const scope = { threadId: "t1", userId: "owner-1" };

beforeEach(() => {
	vi.clearAllMocks();
	recallMemories.mockResolvedValue([]);
});

describe("memoryAdapter.recall", () => {
	it("requires a userId on the scope", async () => {
		await expect(memoryAdapter.recall({ threadId: "t1" }, "hi")).rejects.toThrow(
			"Memory scope is missing userId",
		);
	});

	it("renders matches into the system prompt and fragments", async () => {
		recallMemories.mockResolvedValue([{ id: "m1", category: "fact", text: "likes coffee" }]);

		const result = await memoryAdapter.recall(scope, "coffee");

		expect(result.systemPrompt).toBe("Relevant saved memory:\n- (fact) likes coffee");
		expect(result.fragments).toEqual([{ text: "likes coffee", source: "m1" }]);
	});

	it("renders an empty system prompt when nothing matches, without querying on blank input", async () => {
		const result = await memoryAdapter.recall(scope, "   ");

		expect(recallMemories).not.toHaveBeenCalled();
		expect(result.systemPrompt).toBe("");
		expect(result.fragments).toEqual([]);
	});

	it("gates delete_memory behind approval but not manage_memory", async () => {
		const result = await memoryAdapter.recall(scope, "hi");
		const manageMemory = result.tools?.find((tool) => tool.name === "manage_memory");
		const deleteMemory = result.tools?.find((tool) => tool.name === "delete_memory");

		expect(manageMemory?.needsApproval).toBeFalsy();
		expect(deleteMemory?.needsApproval).toBe(true);
	});

	it("excludes delete from manage_memory's action enum", async () => {
		const result = await memoryAdapter.recall(scope, "hi");
		const manageMemory = result.tools?.find((tool) => tool.name === "manage_memory");
		if (!manageMemory) throw new Error("manage_memory tool was not built");

		const schema = convertSchemaToJsonSchema(manageMemory.inputSchema);
		expect(schema).toMatchObject({ properties: { action: { enum: ["add", "search", "list"] } } });
	});
});

describe("memoryAdapter.save", () => {
	it("performs no automatic writes; extraction stays tool-driven", async () => {
		expect(await memoryAdapter.save(scope, { user: "hi", assistant: "hello" })).toEqual([]);
	});
});
