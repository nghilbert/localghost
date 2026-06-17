import type { ModelMessage, ServerTool, StreamChunk } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod/v4";
import { streamLLMEvents } from "#/lib/llm.server";
import { callMcpTool, type McpToolDef } from "#/lib/mcp.server";
import { manageMemory, manageMemoryArgsSchema } from "#/lib/tools/manage_memory";
import { manageNotes, manageNotesArgsSchema } from "#/lib/tools/manage_notes";
import { manageSkills, manageSkillsArgsSchema } from "#/lib/tools/manage_skills";
import { manageTasks, manageTasksArgsSchema } from "#/lib/tools/manage_tasks";
import { searchChats, searchChatsArgsSchema } from "#/lib/tools/search_chats";
import { webSearch, webSearchArgsSchema } from "#/lib/tools/web_search";

/**
 * Builds the full tool catalog for an agent run: the six built-in tools plus
 * any MCP server tools. Each tool is defined with its JSON schema and an inline
 * server executor, so `chat()` can auto-execute them without a separate dispatcher.
 */
export function buildAgentTools(ownerId: string, mcpTools: McpToolDef[]): ServerTool[] {
	return [
		toolDefinition({
			name: "web_search",
			description:
				"Search the web for current information. Use when you need facts you don't know.",
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
		}),

		toolDefinition({
			name: "manage_memory",
			description:
				"Add, search, list, or delete persistent memories about the user. " +
				"Use add to save important facts the user shares. Use search to recall relevant context.",
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
		}).server(async (args) => manageMemory(manageMemoryArgsSchema.parse(args), ownerId)),

		toolDefinition({
			name: "manage_notes",
			description:
				"Create and manage notes and checklists: list, add, update, delete, toggle_item. " +
				"For to-do lists, set note_type='checklist' and pass items as checklist_items array. " +
				"For freeform notes, use note_type='note' and put the body in content.",
			inputSchema: {
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
					archived: {
						type: "boolean",
						description: "Archive/unarchive or list archived notes",
					},
					due_date: {
						type: "string",
						description: "Reminder time (ISO 8601 or natural language)",
					},
					index: {
						type: "number",
						description: "Checklist item index for toggle_item (0-based)",
					},
					limit: { type: "number", description: "Max results for list (default 20)" },
				},
				required: ["action"],
			},
		}).server(async (args) => manageNotes(manageNotesArgsSchema.parse(args), ownerId)),

		toolDefinition({
			name: "manage_tasks",
			description:
				"Manage scheduled LLM tasks: list, create, update, delete, pause, resume, or run_now. " +
				"Tasks run an LLM prompt on a schedule and deliver output to a chat session.",
			inputSchema: {
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
		}).server(async (args) => manageTasks(manageTasksArgsSchema.parse(args), ownerId)),

		toolDefinition({
			name: "search_chats",
			description:
				"Search the user's past chat conversations by keyword. " +
				"Use when the user asks about previous chats or wants to find a past discussion.",
			inputSchema: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "Keyword(s) to search for in past conversations",
					},
					limit: { type: "number", description: "Max results (default 10)" },
				},
				required: ["query"],
			},
		}).server(async (args) => {
			const { query, limit } = searchChatsArgsSchema.parse(args);
			return searchChats(query ?? "", ownerId, limit ?? 10);
		}),

		toolDefinition({
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
		}).server(async (args) => manageSkills(manageSkillsArgsSchema.parse(args), ownerId)),

		...mcpTools.map((t) =>
			toolDefinition({
				name: t.name,
				description: t.description,
				inputSchema: t.inputSchema,
			}).server(async (args) => callMcpTool(t, z.record(z.string(), z.unknown()).parse(args))),
		),
	];
}

/**
 * Runs the multi-round agent as the raw `@tanstack/ai` (AG-UI) event stream.
 * Built-in tools and any MCP server tools are handed to `streamLLMEvents` as
 * `ServerTool[]`; `chat()` auto-executes them and loops until the model finishes
 * or `MAX_AGENT_ROUNDS` is reached. The resulting event stream (text/thinking
 * deltas, tool-call lifecycle, run lifecycle) passes through for the client to render.
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
	const tools = buildAgentTools(ownerId, mcpTools);
	return streamLLMEvents({ url, apiKey, model, messages, systemPrompt }, tools);
}
