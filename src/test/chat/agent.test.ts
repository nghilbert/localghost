import { describe, expect, it } from "vitest";
import { buildChatTools } from "#/shared/domain/chat/agent.server";

const OWNER = "test-user-id";

function names(tools: ReturnType<typeof buildChatTools>) {
	return tools.map((t) => t.name);
}

describe("buildChatTools", () => {
	it("includes no tools when nothing is selected", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: [] });
		expect(names(tools)).toEqual([]);
	});

	it("adds web_search and read_url for the web_search selection", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: ["web_search"] });
		expect(names(tools)).toEqual(["web_search", "read_url"]);
	});

	it("maps the memory selection to manage_memory", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: ["memory"] });
		expect(names(tools)).toEqual(["manage_memory"]);
	});

	it("ignores unknown selections", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: ["nope"] });
		expect(names(tools)).toEqual([]);
	});

	it("every tool is a server tool with name, description, and object inputSchema", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: ["web_search", "memory"] });
		for (const tool of tools) {
			expect(tool.__toolSide).toBe("server");
			expect(tool.name).toBeTruthy();
			expect(tool.description).toBeTruthy();
			expect(tool.inputSchema).toMatchObject({ type: "object", required: expect.any(Array) });
		}
	});
});
