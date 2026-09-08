import { requestRunCancel } from "@tanstack/ai";
import { createServerFn } from "@tanstack/react-start";
import { conversationOwnedBy } from "#/shared/domain/conversation/conversation.server";
import { authedFn } from "#/shared/lib/middleware";
import { chatPersistence, findRunThreadId } from "./persistence.server";
import { chatRunIdSchema } from "./schemas";

/**
 * Records an explicit cancel for a run: the out-of-band signal `/api/chat/stream`'s
 * disconnect handler checks to tell Stop apart from a dropped connection, which
 * produces the identical disconnect.
 */
export const requestChatRunCancel = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(chatRunIdSchema)
	.handler(async ({ data: runId, context }) => {
		const threadId = await findRunThreadId({ runId });
		if (!threadId || !(await conversationOwnedBy({ id: threadId, ownerId: context.userId })))
			return;
		await requestRunCancel(chatPersistence.stores.runs, runId);
	});
