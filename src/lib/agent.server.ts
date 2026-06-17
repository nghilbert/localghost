import type { ModelMessage, StreamChunk } from "@tanstack/ai";
import { z } from "zod/v4";
import { type LLMTool, streamAgentEvents } from "#/lib/llm.server";
import { callMcpTool, type McpToolDef } from "#/lib/mcp.server";
import { manageMemory, manageMemoryArgsSchema } from "#/lib/tools/manage_memory";
import { manageNotes, manageNotesArgsSchema } from "#/lib/tools/manage_notes";
import { manageSkills, manageSkillsArgsSchema } from "#/lib/tools/manage_skills";
import { manageTasks, manageTasksArgsSchema } from "#/lib/tools/manage_tasks";
import { searchChats, searchChatsArgsSchema } from "#/lib/tools/search_chats";
import { webSearch, webSearchArgsSchema } from "#/lib/tools/web_search";

export const AGENT_TOOLS: LLMTool[] = [
	{
		type: "function",
		function: {
			name: "web_search",
			description:
				"Search the web for current information. Use when you need facts you don't know.",
			parameters: {
				type: "object",
				properties: {
					query: { type: "string", description: "Search query" },
				},
				required: ["query"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "manage_memory",
			description:
				"Add, search, list, or delete persistent memories about the user. " +
				"Use add to save important facts the user shares. Use search to recall relevant context.",
			parameters: {
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
		},
	},
	{
		type: "function",
		function: {
			name: "manage_notes",
			description:
				"Create and manage notes and checklists: list, add, update, delete, toggle_item. " +
				"For to-do lists, set note_type='checklist' and pass items as checklist_items array. " +
				"For freeform notes, use note_type='note' and put the body in content.",
			parameters: {
				type: "object",
				properties: {
					action: {
						type: "string",
						enum: ["list", "add", "update", "delete", "toggle_item"],
						description: "The action to perform",
					},
					id: {
						type: "string",
						description: "Note id or 8-char prefix (for update/delete/toggle_item)",
					},
					title: { type: "string", description: "Note title (for add/update)" },
					content: { type: "string", description: "Body text for note_type='note'" },
					note_type: {
						type: "string",
						enum: ["note", "checklist"],
						description: "'note' = freeform text. 'checklist' = to-do items. Defaults to 'note'.",
					},
					checklist_items: {
						type: "array",
						items: {
							type: "object",
							properties: {
								text: { type: "string" },
								done: { type: "boolean" },
							},
							required: ["text"],
						},
						description: "Checklist items for note_type='checklist'",
					},
					color: { type: "string", description: "Color label (e.g. 'yellow', 'blue')" },
					label: { type: "string", description: "Category label" },
					pinned: { type: "boolean", description: "Pin to top" },
					archived: { type: "boolean", description: "Archive/unarchive or list archived notes" },
					due_date: { type: "string", description: "Reminder time (ISO 8601 or natural language)" },
					index: { type: "number", description: "Checklist item index for toggle_item (0-based)" },
					limit: { type: "number", description: "Max results for list (default 20)" },
				},
				required: ["action"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "manage_tasks",
			description:
				"Manage scheduled LLM tasks: list, create, update, delete, pause, resume, or run_now. " +
				"Tasks run an LLM prompt on a schedule and deliver output to a chat session.",
			parameters: {
				type: "object",
				properties: {
					action: {
						type: "string",
						enum: ["list", "create", "update", "delete", "pause", "resume", "run_now"],
						description: "Action to perform",
					},
					id: {
						type: "string",
						description: "Task id or 8-char prefix (for update/delete/pause/resume/run_now)",
					},
					name: { type: "string", description: "Task name (for create/update)" },
					prompt: {
						type: "string",
						description: "LLM prompt to run on schedule (for create/update)",
					},
					schedule: {
						type: "string",
						enum: ["once", "daily", "weekly", "monthly", "cron"],
						description: "Recurrence schedule",
					},
					scheduled_time: {
						type: "string",
						description: "HH:MM UTC time for daily/weekly/monthly tasks",
					},
					cron_expression: {
						type: "string",
						description: "Cron expression when schedule=cron",
					},
					session_id: { type: "string", description: "Chat session ID to deliver output to" },
					limit: { type: "number", description: "Max results for list (default 20)" },
				},
				required: ["action"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "search_chats",
			description:
				"Search the user's past chat conversations by keyword. " +
				"Use when the user asks about previous chats or wants to find a past discussion.",
			parameters: {
				type: "object",
				properties: {
					query: { type: "string", description: "Keyword(s) to search for in past conversations" },
					limit: { type: "number", description: "Max results (default 10)" },
				},
				required: ["query"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "manage_skills",
			description:
				"List, read, add, update, or delete reusable skills — saved procedures and instructions " +
				"that describe how to accomplish specific tasks. Use add to save a new learned technique. " +
				"Use list or read to recall a saved skill before applying it.",
			parameters: {
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
		},
	},
];

/**
 * Runs the multi-round agent as the raw `@tanstack/ai` (AG-UI) event stream.
 * Built-in {@link AGENT_TOOLS} and any MCP server tools are handed to
 * `streamAgentEvents`, which executes them via {@link executeTool} and loops
 * until the model finishes; the resulting event stream (text/thinking deltas,
 * tool-call lifecycle, run lifecycle) passes through for the client to render.
 *
 * @param opts - Endpoint, model, conversation, owner, and optional MCP tools.
 * @returns The `@tanstack/ai` event stream for this agent run.
 */
export function runAgentEvents(opts: {
	url: string;
	apiKey?: string;
	model: string;
	messages: ModelMessage[];
	systemPrompt?: string;
	ownerId: string;
	/** Extra tools from connected MCP servers */
	mcpTools?: McpToolDef[];
}): AsyncIterable<StreamChunk> {
	const { url, apiKey, model, messages, systemPrompt, ownerId, mcpTools = [] } = opts;

	const mcpToolSchemas: LLMTool[] = mcpTools.map((t) => ({
		type: "function",
		function: {
			name: t.name,
			description: t.description,
			parameters: t.inputSchema,
		},
	}));
	const allTools = [...AGENT_TOOLS, ...mcpToolSchemas];

	return streamAgentEvents({
		url,
		apiKey,
		model,
		messages,
		systemPrompt,
		tools: allTools,
		executeTool: (name, args) => executeTool(name, args, ownerId, mcpTools),
	});
}

/**
 * Dispatches a tool call to its implementation, normalizing the model-supplied
 * arguments and returning a string result (or a description of any error).
 *
 * @param name - The tool name the model invoked.
 * @param rawArgs - The tool input, either a parsed object or a JSON string.
 * @param ownerId - The acting user, threaded to every data-scoped tool.
 * @param mcpTools - Connected MCP tools to fall back to for namespaced names.
 * @returns The tool's textual result.
 */
async function executeTool(
	name: string,
	rawArgs: unknown,
	ownerId: string,
	mcpTools: McpToolDef[] = [],
): Promise<string> {
	try {
		const args = normalizeToolArgs(rawArgs);

		switch (name) {
			case "web_search": {
				const { query } = webSearchArgsSchema.parse(args);
				return webSearch(query ?? "", 5);
			}
			case "manage_memory":
				return manageMemory(manageMemoryArgsSchema.parse(args), ownerId);
			case "manage_notes":
				return manageNotes(manageNotesArgsSchema.parse(args), ownerId);
			case "manage_tasks":
				return manageTasks(manageTasksArgsSchema.parse(args), ownerId);
			case "search_chats": {
				const { query, limit } = searchChatsArgsSchema.parse(args);
				return searchChats(query ?? "", ownerId, limit ?? 10);
			}
			case "manage_skills":
				return manageSkills(manageSkillsArgsSchema.parse(args), ownerId);
		}

		// MCP tool — look up by namespaced name and delegate to the server
		const mcpTool = mcpTools.find((t) => t.name === name);
		if (mcpTool) {
			return callMcpTool(mcpTool, mcpArgsSchema.parse(args));
		}

		return `Unknown tool: ${name}`;
	} catch (err) {
		return `Tool error: ${err instanceof Error ? err.message : "Unknown error"}`;
	}
}

/** MCP tools have no static schema, so their arguments are validated only as a plain object. */
const mcpArgsSchema = z.record(z.string(), z.unknown());

/** Coerces model-supplied tool input, accepting parsed objects or JSON strings; validated per-tool downstream. */
function normalizeToolArgs(raw: unknown): unknown {
	if (typeof raw === "string") {
		try {
			return JSON.parse(raw || "{}");
		} catch {
			return {};
		}
	}
	return raw ?? {};
}
