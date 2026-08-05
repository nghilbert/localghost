import type { AnyServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import { deleteMemoryToolDef } from "#/shared/domain/chat/tool-definitions";
import {
	manageMemory,
	manageMemoryToolArgsSchema,
} from "#/shared/domain/memory/memory-tool.server";
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

function manageMemoryTool(ownerId: string): AnyServerTool {
	return toolDefinition({
		name: "manage_memory",
		description:
			"Persistent long-term memory about the user. " +
			"Use search to recall saved context when the user refers to something from a past " +
			"conversation or asks what you remember. Use add ONLY when the user shares a durable fact " +
			"worth remembering across sessions (a stable preference, personal detail, ongoing project, " +
			"or an explicit 'remember this'). Never save trivial or ephemeral conversation details. " +
			"Use list or search to find a memory's id; to remove one, call delete_memory with that id.",
		inputSchema: manageMemoryToolArgsSchema,
		// `limit` is `z.coerce.number()`, so the pre-coercion input type (unknown)
		// leaks into the handler's args; re-parsing recovers the coerced number.
	}).server(async (args) =>
		manageMemory({ args: manageMemoryToolArgsSchema.parse(args), ownerId }),
	);
}

/** Split out from `manage_memory` so deletion, the one destructive action, pauses for approval. */
function deleteMemoryTool(ownerId: string): AnyServerTool {
	return deleteMemoryToolDef.server(async ({ id }) =>
		manageMemory({ args: { action: "delete", id }, ownerId }),
	);
}

/**
 * Builders for every buildable tool, keyed by the id the client sends. The
 * source of truth for what can be turned on per request; `web_search` is offered
 * to capable models automatically (see `useChatTools`) while the rest are opt-in.
 */
const TOOL_BUILDERS: Record<string, (ownerId: string) => AnyServerTool[]> = {
	web_search: () => [webSearchTool(), readUrlTool()],
	memory: (ownerId) => [manageMemoryTool(ownerId), deleteMemoryTool(ownerId)],
};

type BuildChatToolsOptions = {
	ownerId: string;
	/** The ephemeral per-send tool ids the client opted into. */
	enabledTools: string[];
};

/**
 * Assembles the `AnyServerTool[]` for one chat run from the per-send selection,
 * skipping unknown ids. Only what the client sent is built; the client defaults
 * to web search on when available, the rest opt-in. `chat()` auto-executes them.
 */
export function buildChatTools({ ownerId, enabledTools }: BuildChatToolsOptions): AnyServerTool[] {
	return enabledTools.flatMap((id) => TOOL_BUILDERS[id]?.(ownerId) ?? []);
}
