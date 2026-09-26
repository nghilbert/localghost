import { createServerFn } from "@tanstack/react-start";
import { authedFn } from "#/lib/middleware";
import { memoryIdInput, memoryTextInput, updateMemoryInput } from "./memory.schemas";
import { findMemories, patchMemory, removeMemory, saveMemory } from "./server/memory.server";

/** The user's saved memories, newest first. */
export const listMemories = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => findMemories({ ownerId: context.userId }));

/** Saves a memory the user typed. */
export const createMemory = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(memoryTextInput)
	.handler(async ({ data: { text }, context }) => {
		await saveMemory({ ownerId: context.userId, text, source: "user" });
	});

/**
 * Updates a memory's text and embedding.
 * @throws If the user does not own the memory.
 */
export const updateMemory = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(updateMemoryInput)
	.handler(async ({ data: { id, text }, context }) => {
		const updated = await patchMemory({ id, ownerId: context.userId, text });
		if (!updated) throw new Error("Not found");
	});

/** Deletes a memory. */
export const deleteMemory = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(memoryIdInput)
	.handler(async ({ data: { id }, context }) => {
		await removeMemory({ id, ownerId: context.userId });
	});
