import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { conversationQueryOptions } from "#/entities/conversation/conversation.functions";
import { ChatView } from "#/features/send-message/components/ChatView";
import { Button } from "#/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "#/shared/ui/empty";
import { Spinner } from "#/shared/ui/spinner";

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

function ConversationPage() {
	const { conversationId } = Route.useParams();
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));
	return (
		<div className="w-full h-full min-h-0 mx-auto max-w-4xl">
			<ChatView key={conversation.id} conversation={conversation} />
		</div>
	);
}

function ConversationPending() {
	return (
		<div className="flex h-full items-center justify-center">
			<Spinner />
		</div>
	);
}

function ConversationError() {
	return (
		<Empty className="h-full">
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
