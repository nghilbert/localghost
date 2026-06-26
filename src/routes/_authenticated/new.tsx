import { createFileRoute } from "@tanstack/react-router";
import { NewChat } from "#/features/chat/components/NewChat";
import { conversationsQueryOptions } from "#/features/chat/lib/conversation.functions";

export const Route = createFileRoute("/_authenticated/new")({
	loader: ({ context }) => context.queryClient.ensureQueryData(conversationsQueryOptions()),
	component: NewChatPage,
});

function NewChatPage() {
	return <NewChat />;
}
