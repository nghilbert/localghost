import { createFileRoute } from "@tanstack/react-router";
import {
	ConversationError,
	ConversationPage,
	ConversationPending,
} from "#/features/chat/components/ConversationPage";
import { conversationQueryOptions } from "#/features/chat/lib/conversation.functions";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
	loader: async ({ params, context }) => {
		const conversation = await context.queryClient.ensureQueryData(
			conversationQueryOptions(params.conversationId),
		);
		return { title: conversation.title };
	},
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData ? `${loaderData.title} · localghost` : "localghost" }],
	}),
	pendingComponent: ConversationPending,
	errorComponent: ConversationError,
	component: ConversationPage,
});
