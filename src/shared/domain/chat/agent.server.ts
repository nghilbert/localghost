import type { ServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import type { z } from "zod";
import {
	deleteMemoryArgsSchema,
	manageMemory,
	manageMemoryArgsSchema,
} from "#/shared/domain/memory/memory-tool.server";
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
			"Use list or search to find a memory's id; to remove one, call delete_memory with that id.",
		inputSchema: {
			type: "object",
			properties: {
				action: {
					type: "string",
					enum: ["add", "search", "list"],
					description: "What to do with memories",
				},
				text: { type: "string", description: "Memory text (required for add)" },
				query: { type: "string", description: "Search query (required for search)" },
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

/** Split out from `manage_memory` so deletion, the one destructive action, pauses for approval. */
function deleteMemoryTool(ownerId: string): ServerTool {
	return toolDefinition({
		name: "delete_memory",
		description:
			"Delete a saved memory by id. Find the id first with manage_memory's list or search.",
		inputSchema: {
			type: "object",
			properties: {
				id: { type: "string", description: "Memory ID from a prior list or search result" },
			},
			required: ["id"],
		},
		needsApproval: true,
	}).server(async (args) => {
		const parsed = deleteMemoryArgsSchema.safeParse(args);
		if (!parsed.success) return invalidArgsMessage(parsed.error);
		return manageMemory({ args: { action: "delete", id: parsed.data.id }, ownerId });
	});
}

/**
 * Builders for every buildable tool, keyed by the id the client sends. The
 * source of truth for what can be turned on per request; `web_search` is offered
 * to capable models automatically (see `useChatTools`) while the rest are opt-in.
 */
const TOOL_BUILDERS: Record<string, (ownerId: string) => ServerTool[]> = {
	web_search: () => [webSearchTool(), readUrlTool()],
	memory: (ownerId) => [manageMemoryTool(ownerId), deleteMemoryTool(ownerId)],
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
