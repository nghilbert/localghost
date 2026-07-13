import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUserId } from "#/shared/lib/session.server";
import { findMemories, patchMemory, removeMemory, saveMemory } from "./memory.server";
import { memoryIdInput, memoryTextInput, updateMemoryInput } from "./schemas";

/** The current user's saved memories, newest first, for the Settings Memory list. */
export const listMemories = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return findMemories({ ownerId: userId });
});

/** Saves a memory typed into the Settings Memory tab (source `"user"`). */
export const createMemory = createServerFn({ method: "POST" })
	.validator(memoryTextInput)
	.handler(async ({ data: { text } }) => {
		const userId = await getCurrentUserId();
		await saveMemory({ ownerId: userId, text, source: "user" });
	});

/**
 * Updates a memory's text, recomputing its embedding.
 * @throws If no memory with that id is owned by the current user.
 */
export const updateMemory = createServerFn({ method: "POST" })
	.validator(updateMemoryInput)
	.handler(async ({ data: { id, text } }) => {
		const userId = await getCurrentUserId();
		const updated = await patchMemory({ id, ownerId: userId, text });
		if (!updated) throw new Error("Not found");
	});

export const deleteMemory = createServerFn({ method: "POST" })
	.validator(memoryIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await removeMemory({ id, ownerId: userId });
	});

export const memoriesQueryOptions = () =>
	queryOptions({ queryKey: ["memories"], queryFn: () => listMemories() });
