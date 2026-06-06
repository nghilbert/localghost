import { type LLMMessage, type LLMTool, type SSEChunk, streamLLM } from "#/lib/llm.server";
import { manageMemory } from "#/lib/tools/manage_memory";
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
}): AsyncGenerator<AgentChunk> {
	const { url, apiKey, model, systemPrompt, ownerId } = opts;
	const messages: LLMMessage[] = [...opts.messages];

	for (let round = 0; round < MAX_ROUNDS; round++) {
		let assistantText = "";
		const pendingToolCalls: Array<{ id: string; name: string; rawArgs: string }> = [];

		const stream = await streamLLM({
			url,
			apiKey,
			model,
			messages,
			tools: AGENT_TOOLS,
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
			const result = await executeTool(call.name, call.rawArgs, ownerId);

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

async function executeTool(name: string, rawArgs: string, ownerId: string): Promise<string> {
	try {
		const args = JSON.parse(rawArgs || "{}") as Record<string, unknown>;

		if (name === "web_search") {
			return webSearch((args.query as string) ?? "", 5);
		}

		if (name === "manage_memory") {
			return manageMemory(args as Parameters<typeof manageMemory>[0], ownerId);
		}

		return `Unknown tool: ${name}`;
	} catch (err) {
		return `Tool error: ${err instanceof Error ? err.message : "Unknown error"}`;
	}
}
