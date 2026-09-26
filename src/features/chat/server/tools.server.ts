import type { AnyServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import { readUrl, readUrlArgsSchema } from "#/features/chat/server/read-url.server";
import { webSearch, webSearchArgsSchema } from "#/features/chat/server/web-search.server";

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
 * The tools a request can turn on, keyed by the id the client sends. Memory's tools come
 * from `memoryMiddleware` instead, since memory is always on.
 */
const TOOL_BUILDERS: Record<string, () => AnyServerTool[]> = {
	web_search: () => [webSearchTool(), readUrlTool()],
};

type BuildChatToolsOptions = {
	/** The tool ids the client turned on for this message. */
	enabledTools: string[];
};

/** The server tools for one chat run. Unknown ids are skipped. */
export function buildChatTools({ enabledTools }: BuildChatToolsOptions): AnyServerTool[] {
	return enabledTools.flatMap((id) => TOOL_BUILDERS[id]?.() ?? []);
}
