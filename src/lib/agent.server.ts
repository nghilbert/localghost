import type { ServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod/v4";
import { callMcpTool, type McpToolDef } from "#/lib/mcp.server";
import { MCP_TOOL_PREFIX, type ToolCatalogId } from "#/lib/tools/catalog";
import { manageMemory, manageMemoryArgsSchema } from "#/lib/tools/manage_memory";
import { manageSkills, manageSkillsArgsSchema } from "#/lib/tools/manage_skills";
import { searchChats, searchChatsArgsSchema } from "#/lib/tools/search_chats";
import { webSearch, webSearchArgsSchema } from "#/lib/tools/web_search";

function webSearchTool(): ServerTool {
	return toolDefinition({
		name: "web_search",
		description: "Search the web for current information. Use when you need facts you don't know.",
		inputSchema: {
			type: "object",
			properties: {
				query: { type: "string", description: "Search query" },
			},
			required: ["query"],
		},
	}).server(async (args) => {
		const { query } = webSearchArgsSchema.parse(args);
		return webSearch(query ?? "", 5);
	});
}

function manageMemoryTool(ownerId: string): ServerTool {
	return toolDefinition({
		name: "manage_memory",
		description:
			"Add, search, list, or delete persistent memories about the user. " +
			"Use add to save important facts the user shares. Use search to recall relevant context.",
		inputSchema: {
			type: "object",
			properties: {
				action: {
					type: "string",
					enum: ["add", "search", "list", "delete"],
					description: "What to do with memories",
				},
				text: { type: "string", description: "Memory text (required for add)" },
				query: { type: "string", description: "Search query (required for search)" },
				id: { type: "string", description: "Memory ID (required for delete)" },
				category: {
					type: "string",
					description: "Category hint: fact, preference, contact, project, instruction",
				},
				limit: { type: "number", description: "Max results (default 5)" },
			},
			required: ["action"],
		},
	}).server(async (args) => manageMemory(manageMemoryArgsSchema.parse(args), ownerId));
}

function searchChatsTool(ownerId: string): ServerTool {
	return toolDefinition({
		name: "search_chats",
		description:
			"Search the user's past chat conversations by keyword. " +
			"Use when the user asks about previous chats or wants to find a past discussion.",
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Keyword(s) to search for in past conversations",
				},
				limit: { type: "number", description: "Max results (default 10)" },
			},
			required: ["query"],
		},
	}).server(async (args) => {
		const { query, limit } = searchChatsArgsSchema.parse(args);
		return searchChats(query ?? "", ownerId, limit ?? 10);
	});
}

function manageSkillsTool(ownerId: string): ServerTool {
	return toolDefinition({
		name: "manage_skills",
		description:
			"List, read, add, update, or delete reusable skills — saved procedures and instructions " +
			"that describe how to accomplish specific tasks. Use add to save a new learned technique. " +
			"Use list or read to recall a saved skill before applying it.",
		inputSchema: {
			type: "object",
			properties: {
				action: {
					type: "string",
					enum: ["list", "read", "add", "update", "delete"],
					description: "Action to perform",
				},
				id: {
					type: "string",
					description: "Skill id or 8-char prefix (required for read/update/delete)",
				},
				name: { type: "string", description: "Skill name (required for add)" },
				description: {
					type: "string",
					description: "One-line description of when the skill is useful",
				},
				content: {
					type: "string",
					description: "Skill body — procedure, steps, or instructions (required for add)",
				},
			},
			required: ["action"],
		},
	}).server(async (args) => manageSkills(manageSkillsArgsSchema.parse(args), ownerId));
}

function mcpTool(t: McpToolDef): ServerTool {
	return toolDefinition({
		name: t.name,
		description: t.description,
		inputSchema: t.inputSchema,
	}).server(async (args) => callMcpTool(t, z.record(z.string(), z.unknown()).parse(args)));
}

/** Builders for the user-toggleable catalog tools, keyed by their catalog id. */
const CATALOG_BUILDERS: Record<ToolCatalogId, () => ServerTool> = {
	web_search: webSearchTool,
};

export type BuildChatToolsOptions = {
	ownerId: string;
	/** The user's ephemeral per-send selection: catalog ids and `mcp:<serverId>`. */
	enabledTools: string[];
	/** Tools discovered from the user's enabled MCP servers. */
	mcpTools: McpToolDef[];
	/** Whether automatic memory is active (gives the model the manage_memory tool). */
	memoryEnabled: boolean;
};

/**
 * Assembles the `ServerTool[]` for one chat run from three tiers: always-on
 * tools (search_chats, manage_skills, and manage_memory unless opted out), the
 * user-toggled catalog tools, and the tools of any user-toggled MCP servers.
 * `chat()` auto-executes whatever is returned.
 */
export function buildChatTools({
	ownerId,
	enabledTools,
	mcpTools,
	memoryEnabled,
}: BuildChatToolsOptions): ServerTool[] {
	const tools: ServerTool[] = [searchChatsTool(ownerId), manageSkillsTool(ownerId)];
	if (memoryEnabled) tools.push(manageMemoryTool(ownerId));

	const selected = new Set(enabledTools);
	for (const id of Object.keys(CATALOG_BUILDERS) as ToolCatalogId[]) {
		if (selected.has(id)) tools.push(CATALOG_BUILDERS[id]());
	}

	const enabledServers = new Set(
		enabledTools
			.filter((id) => id.startsWith(MCP_TOOL_PREFIX))
			.map((id) => id.slice(MCP_TOOL_PREFIX.length)),
	);
	for (const t of mcpTools) {
		if (enabledServers.has(t.serverId)) tools.push(mcpTool(t));
	}

	return tools;
}
