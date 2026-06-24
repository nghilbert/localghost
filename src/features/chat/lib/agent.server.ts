import type { ServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import { TOOL_CATALOG, type ToolCatalogId } from "#/lib/tools/catalog";
import { manageMemory, manageMemoryArgsSchema } from "#/lib/tools/manage_memory";
import { readUrl, readUrlArgsSchema } from "#/lib/tools/read_url";
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

/** Builders for the user-toggleable catalog tools, keyed by their catalog id. */
const CATALOG_BUILDERS: Record<ToolCatalogId, (ownerId: string) => ServerTool[]> = {
	web_search: () => [webSearchTool(), readUrlTool()],
	memory: (ownerId) => [manageMemoryTool(ownerId)],
};

type BuildChatToolsOptions = {
	ownerId: string;
	/** The user's ephemeral per-send selection of catalog tool ids. */
	enabledTools: string[];
};

/**
 * Assembles the `ServerTool[]` for one chat run from the user's per-send catalog
 * selection. Nothing is always-on — an untouched send hands the model no tools,
 * which keeps small models reliable. `chat()` auto-executes whatever is returned.
 */
export function buildChatTools({ ownerId, enabledTools }: BuildChatToolsOptions): ServerTool[] {
	const selected = new Set(enabledTools);
	const tools: ServerTool[] = [];
	for (const { id } of TOOL_CATALOG) {
		if (selected.has(id)) tools.push(...CATALOG_BUILDERS[id](ownerId));
	}
	return tools;
}
