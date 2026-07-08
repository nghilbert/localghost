import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { prisma } from "#/shared/lib/db.server";
import { getCurrentUserId } from "#/shared/lib/session.server";

const deleteMemoryInput = z.object({ id: z.uuid() });

/** The current user's saved memories, newest first, for the Settings Memory list. */
export const listMemories = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.memory.findMany({
		where: { ownerId: userId },
		orderBy: { id: "desc" },
		select: { id: true, text: true, category: true, source: true },
	});
});

export const deleteMemory = createServerFn({ method: "POST" })
	.validator(deleteMemoryInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await prisma.memory.deleteMany({ where: { id, ownerId: userId } });
	});

export const memoriesQueryOptions = () =>
	queryOptions({ queryKey: ["memories"], queryFn: () => listMemories() });
