import { convertSchemaToJsonSchema } from "@tanstack/ai";
import { describe, expect, it } from "vitest";
import { readUrlToolDef, webSearchToolDef } from "#/features/chat/chat.schemas";
import { buildChatTools } from "./tools.server";

function names(tools: ReturnType<typeof buildChatTools>) {
	return tools.map((t) => t.name);
}

describe("buildChatTools", () => {
	it("includes no tools when nothing is selected", () => {
		const tools = buildChatTools({ enabledTools: [] });
		expect(names(tools)).toEqual([]);
	});

	it("adds web_search and read_url for the web_search selection", () => {
		const tools = buildChatTools({ enabledTools: ["web_search"] });
		expect(names(tools)).toEqual(["web_search", "read_url"]);
	});

	it("ignores unknown selections", () => {
		const tools = buildChatTools({ enabledTools: ["nope"] });
		expect(names(tools)).toEqual([]);
	});

	it("builds described server tools", () => {
		const tools = buildChatTools({ enabledTools: ["web_search"] });
		for (const tool of tools) {
			expect(tool.__toolSide).toBe("server");
			expect(tool.name).toBeTruthy();
			expect(tool.description).toBeTruthy();
		}
	});

	it("gives each tool an object schema with required fields", () => {
		for (const definition of [webSearchToolDef, readUrlToolDef]) {
			const schema = convertSchemaToJsonSchema(definition.inputSchema);
			expect(schema).toMatchObject({ type: "object" });
			expect(schema?.required?.length).toBeGreaterThan(0);
		}
	});

	it("exposes only query and optional time_range to web_search", () => {
		const schema = convertSchemaToJsonSchema(webSearchToolDef.inputSchema);
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
