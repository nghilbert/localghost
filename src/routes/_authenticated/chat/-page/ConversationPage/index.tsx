import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { conversationQueryOptions } from "#/entities/conversation/conversation.functions";
import { ChatView } from "#/features/send-message/components/ChatView";
import { Button } from "#/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "#/shared/ui/empty";
import { Spinner } from "#/shared/ui/spinner";

const routeApi = getRouteApi("/_authenticated/chat/$conversationId");

export function ConversationPage() {
	const { conversationId } = routeApi.useParams();
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));
	return (
		<div className="w-full h-full min-h-0 mx-auto max-w-4xl">
			<ChatView key={conversation.id} conversation={conversation} />
		</div>
	);
}

export function ConversationPending() {
	return (
		<div className="flex h-full items-center justify-center">
			<Spinner />
		</div>
	);
}

export function ConversationError() {
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
