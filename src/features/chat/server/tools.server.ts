import type { AnyServerTool } from "@tanstack/ai";
import { readUrlToolDef, webSearchToolDef } from "#/features/chat/chat.schemas";
import { readUrl } from "#/features/chat/server/read-url.server";
import { webSearch } from "#/features/chat/server/web-search.server";

function webSearchTool(): AnyServerTool {
	return webSearchToolDef.server(async ({ query, time_range }, context) => {
		return webSearch({
			query,
			limit: 5,
			timeRange: time_range,
			signal: context?.abortSignal,
		});
	});
}

function readUrlTool(): AnyServerTool {
	return readUrlToolDef.server(async ({ url }, context) => readUrl(url, context?.abortSignal));
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
