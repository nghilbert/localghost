import { describe, expect, it } from "vitest";
import { AGENT_TOOLS } from "#/lib/agent.server";

const EXPECTED_TOOLS = [
	"web_search",
	"manage_memory",
	"manage_notes",
	"manage_tasks",
	"search_chats",
	"manage_skills",
];

describe("AGENT_TOOLS", () => {
	it("contains all expected built-in tools", () => {
		const names = AGENT_TOOLS.map((t) => t.function.name);
		for (const expected of EXPECTED_TOOLS) {
			expect(names).toContain(expected);
		}
	});

	it("has exactly 6 built-in tools", () => {
		expect(AGENT_TOOLS).toHaveLength(6);
	});

	it("every tool has type 'function'", () => {
		for (const tool of AGENT_TOOLS) {
			expect(tool.type).toBe("function");
		}
	});

	it("every tool has name, description, and parameters", () => {
		for (const tool of AGENT_TOOLS) {
			expect(tool.function.name).toBeTruthy();
			expect(tool.function.description).toBeTruthy();
			expect(tool.function.parameters).toBeDefined();
		}
	});

	it("every tool's parameters is an object type with required array", () => {
		for (const tool of AGENT_TOOLS) {
			const params = tool.function.parameters as {
				type: string;
				properties: Record<string, unknown>;
				required: string[];
			};
			expect(params.type).toBe("object");
			expect(params.properties).toBeDefined();
			expect(Array.isArray(params.required)).toBe(true);
		}
	});

	it("manage_* tools all require 'action' parameter", () => {
		const manageTools = AGENT_TOOLS.filter((t) => t.function.name.startsWith("manage_"));
		for (const tool of manageTools) {
			const required = (tool.function.parameters as { required: string[] }).required;
			expect(required).toContain("action");
		}
	});

	it("web_search requires 'query'", () => {
		const ws = AGENT_TOOLS.find((t) => t.function.name === "web_search");
		if (!ws) throw new Error("web_search not found");
		const required = (ws.function.parameters as { required: string[] }).required;
		expect(required).toContain("query");
	});
});
