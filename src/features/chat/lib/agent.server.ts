import type { ServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod/v4";
import { callMcpTool, listAllMcpTools, type McpToolDef } from "#/features/mcp/lib/tools.server";
import { prisma } from "#/lib/db.server";
import { MCP_TOOL_PREFIX, TOOL_CATALOG, type ToolCatalogId } from "#/lib/tools/catalog";
import { manageMemory, manageMemoryArgsSchema } from "#/lib/tools/manage_memory";
import { manageSkills, manageSkillsArgsSchema } from "#/lib/tools/manage_skills";
import { readUrl, readUrlArgsSchema } from "#/lib/tools/read_url";
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

function readUrlTool(): ServerTool {
	return toolDefinition({
		name: "read_url",
		description:
			"Fetch a web page and return its main content as clean text. " +
			"Use after web_search to read a result in full.",
		inputSchema: {
			type: "object",
			properties: {
				url: { type: "string", description: "The page URL to read" },
			},
			required: ["url"],
		},
	}).server(async (args) => {
		const { url } = readUrlArgsSchema.parse(args);
		return readUrl(url);
	});
}

function manageMemoryTool(ownerId: string): ServerTool {
	return toolDefinition({
		name: "manage_memory",
		description:
			"Persistent long-term memory about the user. " +
			"Use search to recall saved context when the user refers to something from a past " +
			"conversation or asks what you remember. Use add ONLY when the user shares a durable fact " +
			"worth remembering across sessions (a stable preference, personal detail, ongoing project, " +
			"or an explicit 'remember this') — never save trivial or ephemeral conversation details. " +
			"Use list or delete to manage saved memories.",
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

function searchChatsTool(ownerId: string, conversationId: string): ServerTool {
	return toolDefinition({
		name: "search_chats",
		description:
			"Look through the user's saved past conversations (never the current one). " +
			"Omit the query to list their most recent saved chats — use this when the user asks " +
			"what you've talked about before. Pass a keyword query to find a specific past discussion.",
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Optional keyword(s); omit to list the most recent saved chats",
				},
				limit: { type: "number", description: "Max results (default 10)" },
			},
			required: [],
		},
	}).server(async (args) => {
		const { query, limit } = searchChatsArgsSchema.parse(args);
		return searchChats(query ?? "", ownerId, conversationId, limit ?? 10);
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

/** Context every catalog-tool builder receives for the current chat run. */
type ToolContext = { ownerId: string; conversationId: string };

/** Builders for the user-toggleable catalog tools, keyed by their catalog id. */
const CATALOG_BUILDERS: Record<ToolCatalogId, (ctx: ToolContext) => ServerTool[]> = {
	web_search: () => [webSearchTool(), readUrlTool()],
	memory: ({ ownerId }) => [manageMemoryTool(ownerId)],
	search_chats: ({ ownerId, conversationId }) => [searchChatsTool(ownerId, conversationId)],
	manage_skills: ({ ownerId }) => [manageSkillsTool(ownerId)],
};

export type BuildChatToolsOptions = {
	ownerId: string;
	/** The current conversation's id, so tools can exclude it (e.g. search_chats). */
	conversationId: string;
	/** The user's ephemeral per-send selection: catalog ids and `mcp:<serverId>`. */
	enabledTools: string[];
	/** Tools discovered from the user's enabled MCP servers. */
	mcpTools: McpToolDef[];
};

/**
 * Assembles the `ServerTool[]` for one chat run from the user's per-send
 * selection: the toggled catalog tools plus the tools of any toggled MCP
 * servers. Nothing is always-on — an untouched send hands the model no tools,
 * which keeps small models reliable. `chat()` auto-executes whatever is returned.
 */
export function buildChatTools({
	ownerId,
	conversationId,
	enabledTools,
	mcpTools,
}: BuildChatToolsOptions): ServerTool[] {
	const tools: ServerTool[] = [];

	const selected = new Set(enabledTools);
	for (const { id } of TOOL_CATALOG) {
		if (selected.has(id)) tools.push(...CATALOG_BUILDERS[id]({ ownerId, conversationId }));
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

type ResolveChatToolsOptions = {
	userId: string;
	conversationId: string;
	/** The user's ephemeral per-send selection: catalog ids and `mcp:<serverId>`. */
	enabledTools: string[];
};

/**
 * Resolves the per-send tool selection into an executable `ServerTool[]`,
 * enumerating the user's enabled MCP servers only when they actually toggled one
 * this send (so a tool-less or catalog-only send never hits the MCP transport).
 */
export async function resolveChatTools({
	userId,
	conversationId,
	enabledTools,
}: ResolveChatToolsOptions): Promise<ServerTool[]> {
	const wantsMcp = enabledTools.some((id) => id.startsWith(MCP_TOOL_PREFIX));
	const mcpServers = wantsMcp
		? await prisma.mcpServer.findMany({ where: { ownerId: userId, enabled: true } })
		: [];
	const mcpTools = await listAllMcpTools(
		mcpServers.map((s) => ({ id: s.id, name: s.name, url: s.url, type: s.type })),
	);
	return buildChatTools({ ownerId: userId, conversationId, enabledTools, mcpTools });
}
