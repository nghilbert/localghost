import { toolDefinition } from "@tanstack/ai";
import { memoryIdInput } from "#/shared/domain/memory/schemas";

/**
 * The isomorphic definition for `delete_memory`, the one tool that needs
 * approval. `agent.server.ts` adds the `.server()` implementation; the client
 * passes this bare definition to `useChat` so its approval interrupt types.
 */
export const deleteMemoryToolDef = toolDefinition({
	name: "delete_memory",
	description:
		"Delete a saved memory by id. Find the id first with manage_memory's list or search.",
	inputSchema: memoryIdInput,
	needsApproval: true,
});
