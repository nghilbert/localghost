import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	conversationsQueryOptions,
	createConversation,
} from "#/features/chat/lib/conversation.functions";

export const Route = createFileRoute("/_authenticated/")({
	// Landing goes straight to chat: open the most recent conversation, or create
	// one for a brand-new account so there is always a conversation to drop into.
	loader: async ({ context }) => {
		const conversations = await context.queryClient.ensureQueryData(conversationsQueryOptions());
		const mostRecent = conversations[0];
		if (mostRecent) {
			throw redirect({
				to: "/chat/$conversationId",
				params: { conversationId: mostRecent.id },
			});
		}
		const conversation = await createConversation({ data: { title: "New Chat" } });
		await context.queryClient.invalidateQueries({ queryKey: ["conversations"] });
		throw redirect({
			to: "/chat/$conversationId",
			params: { conversationId: conversation.id },
		});
	},
});
