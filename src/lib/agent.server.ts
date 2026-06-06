import { type LLMMessage, type LLMTool, type SSEChunk, streamLLM } from "#/lib/llm.server";
import { callMcpTool, type McpToolDef } from "#/lib/mcp.server";
import { manageCalendar } from "#/lib/tools/manage_calendar";
import { manageContacts } from "#/lib/tools/manage_contacts";
import { manageDocuments } from "#/lib/tools/manage_documents";
import { manageMemory } from "#/lib/tools/manage_memory";
import { manageNotes } from "#/lib/tools/manage_notes";
import { manageTasks } from "#/lib/tools/manage_tasks";
import { searchChats } from "#/lib/tools/search_chats";
import { webSearch } from "#/lib/tools/web_search";

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
			name: "manage_contacts",
			description:
				"Create, list, update, delete, or resolve contacts. " +
				"Use resolve to look up a contact's email or phone by name. " +
				"Use list to see all contacts. Use add to save a new contact.",
			parameters: {
				type: "object",
				properties: {
					action: {
						type: "string",
						enum: ["list", "add", "update", "delete", "resolve"],
						description: "The action to perform",
					},
					id: { type: "string", description: "Contact id or 8-char prefix (for update/delete)" },
					name: { type: "string", description: "Contact name (for add/update/resolve)" },
					email: { type: "string", description: "Email address (for add/update)" },
					phone: { type: "string", description: "Phone number (for add/update)" },
					notes: { type: "string", description: "Free-form notes about the contact" },
					query: { type: "string", description: "Name search query (for resolve)" },
					limit: { type: "number", description: "Max results for list (default 20)" },
				},
				required: ["action"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "manage_calendar",
			description:
				"Manage calendar events: list_events in a date range, create_event, update_event, delete_event, or list_calendars. " +
				"Pass ISO 8601 datetimes for dtstart/dtend. For all-day events set all_day=true and pass YYYY-MM-DD.",
			parameters: {
				type: "object",
				properties: {
					action: {
						type: "string",
						enum: ["list_events", "create_event", "update_event", "delete_event", "list_calendars"],
						description: "Action to perform",
					},
					summary: { type: "string", description: "Event title (for create/update)" },
					dtstart: {
						type: "string",
						description: "Start ISO datetime or YYYY-MM-DD for all-day",
					},
					dtend: {
						type: "string",
						description: "End ISO datetime; defaults to +1h (or +1 day if all_day)",
					},
					all_day: { type: "boolean", description: "Whether this is an all-day event" },
					description: { type: "string", description: "Event description/notes" },
					location: { type: "string", description: "Event location" },
					uid: { type: "string", description: "Event id or uid (for update/delete)" },
					calendar: {
						type: "string",
						description: "Calendar name filter (for list_events/create_event)",
					},
					start: { type: "string", description: "list_events range start (ISO); defaults to now" },
					end: { type: "string", description: "list_events range end (ISO); defaults to +14 days" },
					rrule: { type: "string", description: "Recurrence rule in iCalendar RRULE format" },
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
			name: "manage_documents",
			description:
				"Create, list, read, edit, or fully update documents in the document library. " +
				"Use create for new documents, edit for targeted find/replace, update for full rewrites. " +
				"Documents support markdown, code, and plain text.",
			parameters: {
				type: "object",
				properties: {
					action: {
						type: "string",
						enum: ["list", "read", "create", "edit", "update"],
						description: "Action to perform",
					},
					id: {
						type: "string",
						description: "Document id or 8-char prefix (for read/edit/update)",
					},
					title: { type: "string", description: "Document title (for create/update)" },
					language: {
						type: "string",
						description: "Language/format (e.g. markdown, python, javascript) for create/update",
					},
					content: {
						type: "string",
						description: "Document content — required for create; full replacement for update",
					},
					edits: {
						type: "array",
						items: {
							type: "object",
							properties: {
								find: { type: "string", description: "Exact text to find" },
								replace: { type: "string", description: "Replacement text" },
							},
							required: ["find", "replace"],
						},
						description: "Find/replace edits for action=edit (first match per entry)",
					},
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
];

export type AgentChunk = SSEChunk | { type: "tool_result"; tool: string; result: string };

const MAX_ROUNDS = 10;

/**
 * Multi-round agent loop. Streams SSE chunks for each round.
 * Runs up to MAX_ROUNDS of: LLM call → execute tool calls → inject results → repeat.
 * Yields AgentChunk events (same as SSEChunk plus tool_result events).
 */
export async function* runAgent(opts: {
	url: string;
	apiKey?: string;
	model: string;
	messages: LLMMessage[];
	systemPrompt?: string;
	ownerId: string;
	/** Extra tools from connected MCP servers */
	mcpTools?: McpToolDef[];
}): AsyncGenerator<AgentChunk> {
	const { url, apiKey, model, systemPrompt, ownerId, mcpTools = [] } = opts;
	const messages: LLMMessage[] = [...opts.messages];

	const mcpToolSchemas: LLMTool[] = mcpTools.map((t) => ({
		type: "function",
		function: {
			name: t.name,
			description: t.description,
			parameters: t.inputSchema,
		},
	}));
	const allTools = [...AGENT_TOOLS, ...mcpToolSchemas];

	for (let round = 0; round < MAX_ROUNDS; round++) {
		let assistantText = "";
		const pendingToolCalls: Array<{ id: string; name: string; rawArgs: string }> = [];

		const stream = await streamLLM({
			url,
			apiKey,
			model,
			messages,
			tools: allTools,
			systemPrompt,
		});
		const reader = stream.getReader();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			yield value;

			if (value.type === "delta") {
				assistantText += value.delta;
			} else if (value.type === "tool_calls") {
				for (const call of value.calls) {
					pendingToolCalls.push({
						id: call.id,
						name: call.function.name,
						rawArgs: call.function.arguments,
					});
				}
			}
		}

		// No tool calls → agent is done
		if (pendingToolCalls.length === 0) {
			return;
		}

		// Push the assistant turn (with tool_calls) into history
		messages.push({
			role: "assistant",
			content: assistantText,
			tool_calls: pendingToolCalls.map((c) => ({
				id: c.id,
				type: "function",
				function: { name: c.name, arguments: c.rawArgs },
			})),
		});

		// Execute each tool call and push results
		for (const call of pendingToolCalls) {
			const result = await executeTool(call.name, call.rawArgs, ownerId, mcpTools);

			yield { type: "tool_result", tool: call.name, result };

			messages.push({
				role: "tool",
				content: result,
				tool_call_id: call.id,
			});
		}
	}

	// Yield a final error if we hit the round limit
	yield { type: "error", error: `Agent exceeded ${MAX_ROUNDS} rounds without finishing.` };
}

async function executeTool(
	name: string,
	rawArgs: string,
	ownerId: string,
	mcpTools: McpToolDef[] = [],
): Promise<string> {
	try {
		const args = JSON.parse(rawArgs || "{}") as Record<string, unknown>;

		if (name === "web_search") {
			return webSearch((args.query as string) ?? "", 5);
		}

		if (name === "manage_memory") {
			return manageMemory(args as Parameters<typeof manageMemory>[0], ownerId);
		}

		if (name === "manage_notes") {
			return manageNotes(args as Parameters<typeof manageNotes>[0], ownerId);
		}

		if (name === "manage_contacts") {
			return manageContacts(args as Parameters<typeof manageContacts>[0], ownerId);
		}

		if (name === "manage_calendar") {
			return manageCalendar(args as Parameters<typeof manageCalendar>[0], ownerId);
		}

		if (name === "manage_tasks") {
			return manageTasks(args as Parameters<typeof manageTasks>[0], ownerId);
		}

		if (name === "manage_documents") {
			return manageDocuments(args as Parameters<typeof manageDocuments>[0], ownerId);
		}

		if (name === "search_chats") {
			return searchChats((args.query as string) ?? "", ownerId, (args.limit as number) ?? 10);
		}

		// MCP tool — look up by namespaced name and delegate to the server
		const mcpTool = mcpTools.find((t) => t.name === name);
		if (mcpTool) {
			return callMcpTool(mcpTool, args);
		}

		return `Unknown tool: ${name}`;
	} catch (err) {
		return `Tool error: ${err instanceof Error ? err.message : "Unknown error"}`;
	}
}
