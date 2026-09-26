import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Spinner } from "#/components/ui/spinner";
import { chatQueries } from "#/features/chat/chat.queries";
import { ChatThread } from "#/features/chat/components/ChatThread";

export const Route = createFileRoute("/_authenticated/_chat/chat/$conversationId")({
	loader: async ({ params, context }) => {
		const conversation = await context.queryClient.query({
			...chatQueries.detail(params.conversationId),
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
	const { data: conversation } = useSuspenseQuery(chatQueries.detail(conversationId));
	return <ChatThread key={conversation.id} conversation={conversation} />;
}

function ConversationPending() {
	return (
		<div className="flex items-center justify-center">
			<Spinner label="Loading chat" />
		</div>
	);
}
