import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { authedFn } from "#/shared/lib/middleware";
import { findMemories, patchMemory, removeMemory, saveMemory } from "./memory.server";
import { memoryIdInput, memoryTextInput, updateMemoryInput } from "./schemas";

/** The current user's saved memories, newest first, for the Settings Memory list. */
export const listMemories = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => findMemories({ ownerId: context.userId }));

/** Saves a memory typed into the Settings Memory tab (source `"user"`). */
export const createMemory = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(memoryTextInput)
	.handler(async ({ data: { text }, context }) => {
		await saveMemory({ ownerId: context.userId, text, source: "user" });
	});

/**
 * Updates a memory's text, recomputing its embedding.
 * @throws If no memory with that id is owned by the current user.
 */
export const updateMemory = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(updateMemoryInput)
	.handler(async ({ data: { id, text }, context }) => {
		const updated = await patchMemory({ id, ownerId: context.userId, text });
		if (!updated) throw new Error("Not found");
	});

export const deleteMemory = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(memoryIdInput)
	.handler(async ({ data: { id }, context }) => {
		await removeMemory({ id, ownerId: context.userId });
	});

export const memoriesQueryOptions = () =>
	queryOptions({ queryKey: ["memories"], queryFn: () => listMemories() });
