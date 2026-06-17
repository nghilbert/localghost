import { describe, expect, it } from "vitest";
import { buildAgentTools } from "#/lib/agent.server";

const EXPECTED_TOOLS = [
	"web_search",
	"manage_memory",
	"manage_notes",
	"manage_tasks",
	"search_chats",
	"manage_skills",
];

describe("buildAgentTools", () => {
	const tools = buildAgentTools("test-user-id", []);

	it("contains all expected built-in tools", () => {
		const names = tools.map((t) => t.name);
		for (const expected of EXPECTED_TOOLS) {
			expect(names).toContain(expected);
		}
	});

	it("has exactly 6 built-in tools", () => {
		expect(tools).toHaveLength(6);
	});

	it("every tool is a server tool", () => {
		for (const tool of tools) {
			expect(tool.__toolSide).toBe("server");
		}
	});

	it("every tool has name, description, and inputSchema", () => {
		for (const tool of tools) {
			expect(tool.name).toBeTruthy();
			expect(tool.description).toBeTruthy();
			expect(tool.inputSchema).toBeDefined();
		}
	});

	it("every tool's inputSchema is an object type with required array", () => {
		for (const tool of tools) {
			const schema = tool.inputSchema as {
				type: string;
				properties: Record<string, unknown>;
				required: string[];
			};
			expect(schema.type).toBe("object");
			expect(schema.properties).toBeDefined();
			expect(Array.isArray(schema.required)).toBe(true);
		}
	});

	it("manage_* tools all require 'action' parameter", () => {
		const manageTools = tools.filter((t) => t.name.startsWith("manage_"));
		for (const tool of manageTools) {
			const required = (tool.inputSchema as { required: string[] }).required;
			expect(required).toContain("action");
		}
	});

	it("web_search requires 'query'", () => {
		const ws = tools.find((t) => t.name === "web_search");
		if (!ws) throw new Error("web_search not found");
		const required = (ws.inputSchema as { required: string[] }).required;
		expect(required).toContain("query");
	});
});
