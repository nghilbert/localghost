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

/** Every memory action with its arguments. */
export const manageMemoryArgsSchema = z.object({
	action: z.enum(["add", "search", "list", "delete"]),
	text: z.string().optional(),
	query: z.string().optional(),
	id: z.uuid().optional(),
	category: z.string().optional(),
	limit: z.coerce.number().optional(),
});

/** The `manage_memory` tool's arguments. Deletion goes through `delete_memory`, which needs approval. */
export const manageMemoryToolArgsSchema = manageMemoryArgsSchema.omit({ id: true }).extend({
	action: z.enum(["add", "search", "list"]),
});

/** The `manage_memory` tool definition. The server adds its handler. */
export const manageMemoryToolDef = toolDefinition({
	name: "manage_memory",
	description:
		"Persistent long-term memory about the user. " +
		"Use search to recall saved context when the user refers to something from a past " +
		"conversation or asks what you remember. Use add ONLY when the user shares a durable fact " +
		"worth remembering across sessions (a stable preference, personal detail, ongoing project, " +
		"or an explicit 'remember this'). Never save trivial or ephemeral conversation details. " +
		"Use list or search to find a memory's id; to remove one, call delete_memory with that id.",
	inputSchema: manageMemoryToolArgsSchema,
});

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
