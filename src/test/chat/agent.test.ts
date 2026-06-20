import { describe, expect, it } from "vitest";
import { buildChatTools } from "#/features/chat/lib/agent.server";
import type { McpToolDef } from "#/features/mcp/lib/tools.server";

const OWNER = "test-user-id";

function names(tools: ReturnType<typeof buildChatTools>) {
	return tools.map((t) => t.name);
}

describe("buildChatTools", () => {
	it("includes no tools when nothing is selected", () => {
		const tools = buildChatTools({ ownerId: OWNER, enabledTools: [], mcpTools: [] });
		expect(names(tools)).toEqual([]);
	});

	it("adds web_search and read_url for the web_search selection", () => {
		const tools = buildChatTools({
			ownerId: OWNER,
			enabledTools: ["web_search"],
			mcpTools: [],
		});
		expect(names(tools)).toEqual(["web_search", "read_url"]);
	});

	it("maps catalog ids to their built-in tools", () => {
		const memory = buildChatTools({ ownerId: OWNER, enabledTools: ["memory"], mcpTools: [] });
		expect(names(memory)).toEqual(["manage_memory"]);

		const chats = buildChatTools({ ownerId: OWNER, enabledTools: ["search_chats"], mcpTools: [] });
		expect(names(chats)).toEqual(["search_chats"]);

		const skills = buildChatTools({
			ownerId: OWNER,
			enabledTools: ["manage_skills"],
			mcpTools: [],
		});
		expect(names(skills)).toEqual(["manage_skills"]);
	});

	it("includes MCP tools only for enabled `mcp:<serverId>` selections", () => {
		const mcpTools: McpToolDef[] = [
			{
				name: "mcp__weather__get",
				originalName: "get",
				description: "Get weather",
				inputSchema: { type: "object", properties: {}, required: [] },
				serverId: "server-1",
				serverUrl: "http://localhost/mcp",
				serverType: "streamable-http",
			},
		];

		const off = buildChatTools({ ownerId: OWNER, enabledTools: [], mcpTools });
		expect(names(off)).not.toContain("mcp__weather__get");

		const on = buildChatTools({
			ownerId: OWNER,
			enabledTools: ["mcp:server-1"],
			mcpTools,
		});
		expect(names(on)).toContain("mcp__weather__get");
	});

	it("every tool is a server tool with name, description, and object inputSchema", () => {
		const tools = buildChatTools({
			ownerId: OWNER,
			enabledTools: ["web_search", "memory", "search_chats", "manage_skills"],
			mcpTools: [],
		});
		for (const tool of tools) {
			expect(tool.__toolSide).toBe("server");
			expect(tool.name).toBeTruthy();
			expect(tool.description).toBeTruthy();
			const schema = tool.inputSchema as { type: string; required: string[] };
			expect(schema.type).toBe("object");
			expect(Array.isArray(schema.required)).toBe(true);
		}
	});
});
