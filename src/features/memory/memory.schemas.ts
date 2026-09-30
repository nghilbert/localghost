import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/** A memory's text. */
export const memoryTextInput = z.object({
	text: z.string().trim().min(1, "Memory text is required").max(2000),
});

/** A memory id and its new text. */
export const updateMemoryInput = memoryTextInput.extend({ id: z.uuid() });

/** Identifies a memory. */
export const memoryIdInput = z.object({ id: z.uuid() });

/**
 * The `delete_memory` tool definition, which needs approval. The server adds its handler;
 * the client passes it to `useChat` so the approval request is typed.
 */
export const deleteMemoryToolDef = toolDefinition({
	name: "delete_memory",
	description:
		"Delete a saved memory by id. Find the id first with manage_memory's list or search.",
	inputSchema: memoryIdInput,
	needsApproval: true,
});
