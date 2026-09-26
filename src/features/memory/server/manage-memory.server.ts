import { z } from "zod";
import { findMemories, recallMemories, removeMemory, saveMemory } from "./memory.server";

/** Every memory action with its arguments. */
const manageMemoryArgsSchema = z.object({
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

type ManageMemoryArgs = z.infer<typeof manageMemoryArgsSchema>;

/** Runs a memory action and returns the result as text for the model. */
export async function manageMemory({
	args,
	ownerId,
}: {
	args: ManageMemoryArgs;
	ownerId: string;
}): Promise<string> {
	switch (args.action) {
		case "add":
			return addMemory({ args, ownerId });
		case "search":
			return searchMemory({ args, ownerId });
		case "list":
			return listMemories({ args, ownerId });
		case "delete":
			return deleteMemory({ args, ownerId });
	}
}

async function addMemory({
	args,
	ownerId,
}: {
	args: ManageMemoryArgs;
	ownerId: string;
}): Promise<string> {
	if (!args.text?.trim()) return "text is required to add a memory";

	const result = await saveMemory({ ownerId, text: args.text, category: args.category });
	const preview = `${args.text.slice(0, 80)}${args.text.length > 80 ? "..." : ""}`;

	// Tells the model it is already saved, so it doesn't retry with other wording.
	return result.status === "duplicate"
		? `Already remembered: "${preview}"`
		: `Memory saved: "${preview}"`;
}

async function searchMemory({
	args,
	ownerId,
}: {
	args: ManageMemoryArgs;
	ownerId: string;
}): Promise<string> {
	const query = args.query?.trim();
	if (!query) return "query is required to search memories";

	const rows = await recallMemories({ ownerId, query, limit: args.limit ?? 5 });
	if (rows.length === 0) return "No matching memories found.";
	return rows.map((r) => `[${r.id}] (${r.category}) ${r.text}`).join("\n");
}

async function listMemories({
	args,
	ownerId,
}: {
	args: ManageMemoryArgs;
	ownerId: string;
}): Promise<string> {
	const memories = await findMemories({ ownerId, limit: Math.min(args.limit ?? 10, 50) });

	if (memories.length === 0) return "No memories saved yet.";
	return memories.map((m) => `[${m.id}] (${m.category}) ${m.text}`).join("\n");
}

async function deleteMemory({
	args,
	ownerId,
}: {
	args: ManageMemoryArgs;
	ownerId: string;
}): Promise<string> {
	if (!args.id) return "id is required to delete a memory";
	const deleted = await removeMemory({ id: args.id, ownerId });
	return deleted ? "Memory deleted." : "Memory not found.";
}
