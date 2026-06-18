import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { prisma } from "#/lib/db.server";

const createCompareConversationInput = z.object({
	endpointId: z.uuid(),
	model: z.string().min(1),
});

/**
 * Creates a transient `Conversation` row (mode="compare") that the chat stream
 * route uses to look up endpoint config. Compare conversations are excluded from
 * the sidebar's conversation list.
 */
export const createCompareConversation = createServerFn({ method: "POST" })
	.validator(createCompareConversationInput)
	.handler(async ({ data: { endpointId, model } }) => {
		const userId = await getCurrentUserId();
		return prisma.conversation.create({
			data: {
				title: "Compare",
				endpointId,
				model,
				mode: "compare",
				ownerId: userId,
			},
		});
	});

const deleteCompareConversationInput = z.object({ id: z.uuid() });

export const deleteCompareConversation = createServerFn({ method: "POST" })
	.validator(deleteCompareConversationInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await prisma.conversation.deleteMany({
			where: { id, ownerId: userId, mode: "compare" },
		});
	});

export const listCompareConversations = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.conversation.findMany({
		where: { ownerId: userId, mode: "compare" },
		select: { id: true },
	});
});

export const compareConversationsQueryOptions = () =>
	queryOptions({ queryKey: ["compare-conversations"], queryFn: () => listCompareConversations() });
