import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Spinner } from "#/components/ui/spinner";
import { ChatView } from "#/features/chat/components/ChatView";
import { conversationQueryOptions } from "#/features/chat/lib/conversation.functions";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(conversationQueryOptions(params.conversationId));
	},
	pendingComponent: () => (
		<div className="flex h-full items-center justify-center">
			<Spinner />
		</div>
	),
	component: ConversationPage,
});

function ConversationPage() {
	const { conversationId } = Route.useParams();
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));
	return (
		<div className="w-full h-full min-y-0 mx-auto max-w-4xl">
			<ChatView key={conversation.id} conversation={conversation} />
		</div>
	);
}
