import type { ServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import { manageMemory, manageMemoryArgsSchema } from "#/lib/tools/manage_memory";
import { readUrl, readUrlArgsSchema } from "#/lib/tools/read_url";
import { webSearch, webSearchArgsSchema } from "#/lib/tools/web_search";

function webSearchTool(): ServerTool {
	return toolDefinition({
		name: "web_search",
		description:
			"Search the web via SearXNG for current information — facts you don't know or recent events. " +
			"Narrow the search when it helps: set `time_range` to 'day'/'month'/'year' for recent or " +
			"time-sensitive topics, set `categories` (e.g. 'news', 'science', 'it') to focus the source set, " +
			"and use operators inside `query` such as 'site:example.com' to restrict to one domain.",
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query. Supports operators like 'site:domain.com'.",
				},
				time_range: {
					type: "string",
					enum: ["day", "month", "year"],
					description: "Restrict results to the last day, month, or year.",
				},
				categories: {
					type: "string",
					description:
						"Comma-separated SearXNG categories to focus the search: general, news, science, it, " +
						"images, videos, music, files, social media.",
				},
			},
			required: ["query"],
		},
	}).server(async (args) => {
		const { query, time_range, categories } = webSearchArgsSchema.parse(args);
		return webSearch(query ?? "", 5, { timeRange: time_range, categories });
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

/**
 * Builders for every buildable tool, keyed by the id the client sends. The
 * source of truth for what can be turned on per request; `web_search` is offered
 * to capable models automatically (see `useChatTools`) while the rest are opt-in.
 */
const TOOL_BUILDERS: Record<string, (ownerId: string) => ServerTool[]> = {
	web_search: () => [webSearchTool(), readUrlTool()],
	memory: (ownerId) => [manageMemoryTool(ownerId)],
};

type BuildChatToolsOptions = {
	ownerId: string;
	/** The ephemeral per-send tool ids the client opted into. */
	enabledTools: string[];
};

/**
 * Assembles the `ServerTool[]` for one chat run from the per-send selection,
 * skipping any unknown ids. Nothing is always-on — an untouched send hands the
 * model no tools, which keeps small models reliable. `chat()` auto-executes them.
 */
export function buildChatTools({ ownerId, enabledTools }: BuildChatToolsOptions): ServerTool[] {
	return enabledTools.flatMap((id) => TOOL_BUILDERS[id]?.(ownerId) ?? []);
}
