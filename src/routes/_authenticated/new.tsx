import { createFileRoute, redirect } from "@tanstack/react-router";
import { startConversation } from "#/features/chat/lib/conversation.functions";

export const Route = createFileRoute("/_authenticated/new")({
	// Opening a new chat reuses an empty draft or creates one, then hands off to
	// the conversation view. No standalone page; the first message is sent there
	// through the same composer path as every later message.
	loader: async () => {
		const { id } = await startConversation();
		throw redirect({ to: "/chat/$conversationId", params: { conversationId: id } });
	},
});
