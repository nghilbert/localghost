import type { AnyServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import { readUrl, readUrlArgsSchema } from "#/shared/lib/tools/read-url.server";
import { webSearch, webSearchArgsSchema } from "#/shared/lib/tools/web-search.server";

function webSearchTool(): AnyServerTool {
	return toolDefinition({
		name: "web_search",
		description:
			"Search the web for external or current information. Add `time_range` only when the user " +
			"explicitly needs results from the last day, month, or year.",
		inputSchema: webSearchArgsSchema,
	}).server(async ({ query, time_range }, context) => {
		return webSearch({
			query,
			limit: 5,
			timeRange: time_range,
			signal: context?.abortSignal,
		});
	});
}

function readUrlTool(): AnyServerTool {
	return toolDefinition({
		name: "read_url",
		description:
			"Fetch a web page and return its main content as clean text. " +
			"Use after web_search to read a result in full.",
		inputSchema: readUrlArgsSchema,
	}).server(async ({ url }) => readUrl(url));
}

/**
 * Builders for every buildable tool, keyed by the id the client sends. The
 * source of truth for what can be turned on per request. Memory's tools are
 * not here: `memoryMiddleware` provides them via its adapter's `recall`, since
 * memory is always-on rather than a per-message toggle.
 */
const TOOL_BUILDERS: Record<string, () => AnyServerTool[]> = {
	web_search: () => [webSearchTool(), readUrlTool()],
};

type BuildChatToolsOptions = {
	/** The ephemeral per-send tool ids the client opted into. */
	enabledTools: string[];
};

/**
 * Assembles the `AnyServerTool[]` for one chat run from the per-send selection,
 * skipping unknown ids. Only what the client sent is built; the client defaults
 * to web search on when available, the rest opt-in. `chat()` auto-executes them.
 */
export function buildChatTools({ enabledTools }: BuildChatToolsOptions): AnyServerTool[] {
	return enabledTools.flatMap((id) => TOOL_BUILDERS[id]?.() ?? []);
}
