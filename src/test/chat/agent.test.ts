import { convertSchemaToJsonSchema } from "@tanstack/ai";
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

	it("maps the memory selection to manage_memory and delete_memory", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: ["memory"] });
		expect(names(tools)).toEqual(["manage_memory", "delete_memory"]);
	});

	it("gates delete_memory behind approval but not manage_memory", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: ["memory"] });
		const manageMemory = tools.find((tool) => tool.name === "manage_memory");
		const deleteMemory = tools.find((tool) => tool.name === "delete_memory");
		expect(manageMemory?.needsApproval).toBeFalsy();
		expect(deleteMemory?.needsApproval).toBe(true);
	});

	it("excludes delete from manage_memory's action enum", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: ["memory"] });
		const manageMemory = tools.find((tool) => tool.name === "manage_memory");
		if (!manageMemory) throw new Error("manage_memory tool was not built");
		const schema = convertSchemaToJsonSchema(manageMemory.inputSchema);
		expect(schema).toMatchObject({ properties: { action: { enum: ["add", "search", "list"] } } });
	});

	it("ignores unknown selections", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: ["nope"] });
		expect(names(tools)).toEqual([]);
	});

	it("builds server tools with described object schemas", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: ["web_search", "memory"] });
		for (const tool of tools) {
			expect(tool.__toolSide).toBe("server");
			expect(tool.name).toBeTruthy();
			expect(tool.description).toBeTruthy();
			expect(convertSchemaToJsonSchema(tool.inputSchema)).toMatchObject({
				type: "object",
				required: expect.any(Array),
			});
		}
	});

	it("exposes only query and optional time_range to web_search", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: ["web_search"] });
		const webSearch = tools.find((tool) => tool.name === "web_search");
		if (!webSearch) throw new Error("web_search tool was not built");

		const schema = convertSchemaToJsonSchema(webSearch.inputSchema);
		expect(schema).toMatchObject({
			type: "object",
			properties: {
				query: { type: "string", minLength: 1 },
				time_range: { enum: ["day", "month", "year"] },
			},
			required: ["query"],
		});
		expect(schema).not.toHaveProperty("properties.category");
	});
});
