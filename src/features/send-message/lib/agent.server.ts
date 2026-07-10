import type { ServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import type { z } from "zod";
import { manageMemory, manageMemoryArgsSchema } from "#/entities/memory/memory-tool.server";
import { readUrl, readUrlArgsSchema } from "#/shared/lib/tools/read-url.server";
import { webSearch, webSearchArgsSchema } from "#/shared/lib/tools/web-search.server";

/**
 * A short corrective message a model can act on. A thrown ZodError would abort
 * the whole run; returning this as the tool result lets the model fix its
 * arguments and retry.
 */
function invalidArgsMessage(error: z.ZodError): string {
	const issues = error.issues.map(
		(issue) => `${issue.path.join(".") || "arguments"}: ${issue.message}`,
	);
	return `Invalid tool arguments, fix and retry. ${issues.join("; ")}`;
}

function webSearchTool(): ServerTool {
	return toolDefinition({
		name: "web_search",
		description:
			"Search the web via SearXNG for current information: facts you don't know or recent events. " +
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
		const parsed = webSearchArgsSchema.safeParse(args);
		if (!parsed.success) return invalidArgsMessage(parsed.error);
		const { query, time_range, categories } = parsed.data;
		return webSearch(query, 5, { timeRange: time_range, categories });
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
		const parsed = readUrlArgsSchema.safeParse(args);
		if (!parsed.success) return invalidArgsMessage(parsed.error);
		return readUrl(parsed.data.url);
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
			"or an explicit 'remember this'). Never save trivial or ephemeral conversation details. " +
			"Use list or search to find a memory's id, then delete with that id to remove it.",
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
				id: {
					type: "string",
					description: "Memory ID from a prior list or search result (required for delete)",
				},
				category: {
					type: "string",
					description: "Category hint: fact, preference, contact, project, instruction",
				},
				limit: { type: "number", description: "Max results (default 5)" },
			},
			required: ["action"],
		},
	}).server(async (args) => {
		const parsed = manageMemoryArgsSchema.safeParse(args);
		if (!parsed.success) return invalidArgsMessage(parsed.error);
		return manageMemory({ args: parsed.data, ownerId });
	});
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
 * skipping unknown ids. Only what the client sent is built; the client defaults
 * to web search on when available, the rest opt-in. `chat()` auto-executes them.
 */
export function buildChatTools({ ownerId, enabledTools }: BuildChatToolsOptions): ServerTool[] {
	return enabledTools.flatMap((id) => TOOL_BUILDERS[id]?.(ownerId) ?? []);
}
