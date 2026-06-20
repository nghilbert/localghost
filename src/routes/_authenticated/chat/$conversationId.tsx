import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "#/features/chat/components/ChatView";
import { conversationQueryOptions } from "#/features/chat/lib/conversation.functions";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(conversationQueryOptions(params.conversationId));
	},
	component: ConversationPage,
});

function ConversationPage() {
	const { conversationId } = Route.useParams();
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));
	return (
		<ChatView key={conversation.id} conversation={conversation} className="mx-auto max-w-4xl" />
	);
}
