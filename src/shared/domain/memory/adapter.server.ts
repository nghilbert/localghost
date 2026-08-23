import type { AnyServerTool } from "@tanstack/ai";
import { toolDefinition } from "@tanstack/ai";
import type { MemoryAdapter, MemoryFact, MemoryScope, RecallResult } from "@tanstack/ai-memory";
import { deleteMemoryToolDef } from "#/shared/domain/chat/tool-definitions";
import { findMemories, recallMemories } from "#/shared/domain/memory/memory.server";
import { manageMemory, manageMemoryToolArgsSchema } from "#/shared/domain/memory/tool.server";

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
 * pgvector similarity search over the user's memories (keyword fallback when no
 * embedding endpoint is configured), rendered as a system-prompt block. Ranking
 * is entirely this adapter's concern per the `MemoryAdapter` contract.
 */
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

/**
 * No automatic writes: extraction stays tool-driven (the model calls
 * `manage_memory`'s `add` action explicitly), matching the product's existing
 * behavior of only saving facts the model deliberately chose to keep.
 */
async function save(): ReturnType<MemoryAdapter["save"]> {
	return [];
}

async function listFacts(scope: MemoryScope): Promise<Array<MemoryFact>> {
	const memories = await findMemories({ ownerId: requireUserId(scope) });
	return memories.map((m) => ({ id: m.id, text: m.text, source: m.source }));
}

/** Backs `memoryMiddleware`: pgvector recall plus tool-driven save, over the `Memory` table. */
export const memoryAdapter: MemoryAdapter = {
	id: "pgvector",
	name: "pgvector semantic memory",
	recall,
	save,
	listFacts,
};
