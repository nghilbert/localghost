import type { AnyServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import type { MemoryAdapter, MemoryFact, MemoryScope, RecallResult } from "@tanstack/ai-memory";
import { deleteMemoryToolDef } from "#/features/memory/memory.schemas";
import { manageMemory, manageMemoryToolArgsSchema } from "./manage-memory.server";
import { findMemories, recallMemories } from "./memory.server";

const TOOL_GUIDANCE =
	"Relevant saved memory for this conversation is included above, if any. Use manage_memory to " +
	"search further or add a new durable fact the user shares; use delete_memory to remove one.";

function requireUserId(scope: MemoryScope): string {
	if (!scope.userId) throw new Error("Memory scope is missing userId");
	return scope.userId;
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
		// The handler's args are typed from the schema's input, where the coerced `limit` is unknown.
	}).server(async (args) =>
		manageMemory({ args: manageMemoryToolArgsSchema.parse(args), ownerId }),
	);
}

/** A separate tool so deletion, the one destructive action, waits for the user's approval. */
function deleteMemoryTool(ownerId: string): AnyServerTool {
	return deleteMemoryToolDef.server(async ({ id }) =>
		manageMemory({ args: { action: "delete", id }, ownerId }),
	);
}

/** Finds the memories most related to `query` and adds them to the system prompt. */
async function recall(scope: MemoryScope, query: string): Promise<RecallResult> {
	const ownerId = requireUserId(scope);
	const trimmed = query.trim();
	const rows = trimmed ? await recallMemories({ ownerId, query: trimmed, limit: 5 }) : [];

	return {
		systemPrompt:
			rows.length > 0
				? `Relevant saved memory:\n${rows.map((r) => `- (${r.category}) ${r.text}`).join("\n")}`
				: "",
		fragments: rows.map((r) => ({ text: r.text, source: r.id })),
		tools: [manageMemoryTool(ownerId), deleteMemoryTool(ownerId)],
		toolGuidance: TOOL_GUIDANCE,
	};
}

/** Saves nothing automatically; the model saves facts with `manage_memory`. */
async function save(): ReturnType<MemoryAdapter["save"]> {
	return [];
}

async function listFacts(scope: MemoryScope): Promise<Array<MemoryFact>> {
	const memories = await findMemories({ ownerId: requireUserId(scope) });
	return memories.map((m) => ({ id: m.id, text: m.text, source: m.source }));
}

/** The `MemoryAdapter` for `memoryMiddleware`, backed by the `Memory` table and pgvector. */
export const memoryAdapter: MemoryAdapter = {
	id: "pgvector",
	name: "pgvector semantic memory",
	recall,
	save,
	listFacts,
};
