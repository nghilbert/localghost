import { createFileRoute } from "@tanstack/react-router";
import { conversationQueryOptions } from "#/entities/conversation/conversation.functions";
import { ConversationError, ConversationPage, ConversationPending } from "./-page/ConversationPage";

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
