import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChatThread } from "#/routes/_authenticated/_chat/-components/ChatThread";
import { Button } from "#/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/shared/components/ui/empty";
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
	errorComponent: ConversationError,
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

function ConversationError() {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyTitle>Couldn't load this chat</EmptyTitle>
				<EmptyDescription>It may have been deleted, or the server is unreachable.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button variant="outline" render={<Link to="/new" />}>
					Start a new chat
				</Button>
			</EmptyContent>
		</Empty>
	);
}
