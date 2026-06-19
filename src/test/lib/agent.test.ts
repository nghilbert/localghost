import { describe, expect, it } from "vitest";
import { buildChatTools } from "#/lib/agent.server";
import type { McpToolDef } from "#/lib/mcp.server";

const OWNER = "test-user-id";

function names(tools: ReturnType<typeof buildChatTools>) {
	return tools.map((t) => t.name);
}

describe("buildChatTools", () => {
	it("always includes search_chats and manage_skills", () => {
		const tools = buildChatTools({
			ownerId: OWNER,
			enabledTools: [],
			mcpTools: [],
			memoryEnabled: false,
		});
		expect(names(tools)).toEqual(["search_chats", "manage_skills"]);
	});

	it("adds manage_memory only when memory is enabled", () => {
		const enabled = buildChatTools({
			ownerId: OWNER,
			enabledTools: [],
			mcpTools: [],
			memoryEnabled: true,
		});
		expect(names(enabled)).toContain("manage_memory");

		const disabled = buildChatTools({
			ownerId: OWNER,
			enabledTools: [],
			mcpTools: [],
			memoryEnabled: false,
		});
		expect(names(disabled)).not.toContain("manage_memory");
	});

	it("adds a catalog tool when its id is in enabledTools", () => {
		const without = buildChatTools({
			ownerId: OWNER,
			enabledTools: [],
			mcpTools: [],
			memoryEnabled: true,
		});
		expect(names(without)).not.toContain("web_search");

		const withTool = buildChatTools({
			ownerId: OWNER,
			enabledTools: ["web_search"],
			mcpTools: [],
			memoryEnabled: true,
		});
		expect(names(withTool)).toContain("web_search");
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

		const off = buildChatTools({ ownerId: OWNER, enabledTools: [], mcpTools, memoryEnabled: true });
		expect(names(off)).not.toContain("mcp__weather__get");

		const on = buildChatTools({
			ownerId: OWNER,
			enabledTools: ["mcp:server-1"],
			mcpTools,
			memoryEnabled: true,
		});
		expect(names(on)).toContain("mcp__weather__get");
	});

	it("every tool is a server tool with name, description, and object inputSchema", () => {
		const tools = buildChatTools({
			ownerId: OWNER,
			enabledTools: ["web_search"],
			mcpTools: [],
			memoryEnabled: true,
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
