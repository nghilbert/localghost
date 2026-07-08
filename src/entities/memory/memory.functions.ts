import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { getCurrentUserId } from "#/shared/lib/session.server";
import { findMemories, removeMemory } from "./memory.server";

const deleteMemoryInput = z.object({ id: z.uuid() });

/** The current user's saved memories, newest first, for the Settings Memory list. */
export const listMemories = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return findMemories({ ownerId: userId });
});

export const deleteMemory = createServerFn({ method: "POST" })
	.validator(deleteMemoryInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await removeMemory({ id, ownerId: userId });
	});

export const memoriesQueryOptions = () =>
	queryOptions({ queryKey: ["memories"], queryFn: () => listMemories() });
