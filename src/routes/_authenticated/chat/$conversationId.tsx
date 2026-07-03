import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { Spinner } from "#/components/ui/spinner";
import { ChatView } from "#/features/chat/components/ChatView";
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
	pendingComponent: () => (
		<div className="flex h-full items-center justify-center">
			<Spinner />
		</div>
	),
	errorComponent: ConversationError,
	component: ConversationPage,
});

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

function ConversationPage() {
	const { conversationId } = Route.useParams();
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));
	return (
		<div className="w-full h-full min-h-0 mx-auto max-w-4xl">
			<ChatView key={conversation.id} conversation={conversation} />
		</div>
	);
}
