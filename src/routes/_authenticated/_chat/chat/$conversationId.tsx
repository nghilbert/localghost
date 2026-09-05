import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChatThread } from "#/routes/_authenticated/_chat/-components/ChatThread";
import { Spinner } from "#/shared/components/ui/spinner";
import { conversationQueryOptions } from "#/shared/domain/conversation/conversation.functions";

export const Route = createFileRoute("/_authenticated/_chat/chat/$conversationId")({
	loader: async ({ params, context }) => {
		const conversation = await context.queryClient.query({
			...conversationQueryOptions(params.conversationId),
			staleTime: "static",
		});
		return { title: conversation.title };
	},
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData ? `${loaderData.title} · localghost` : "localghost" }],
	}),
	pendingComponent: ConversationPending,
	component: ConversationPage,
});

function ConversationPage() {
	const { conversationId } = Route.useParams();
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));
	return <ChatThread key={conversation.id} conversation={conversation} />;
}

function ConversationPending() {
	return (
		<div className="flex items-center justify-center">
			<Spinner />
		</div>
	);
}
