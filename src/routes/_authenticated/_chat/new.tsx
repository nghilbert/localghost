import { createFileRoute } from "@tanstack/react-router";
import { chatQueries } from "#/features/chat/chat.queries";
import { NewChat } from "#/features/chat/components/NewChat";
import { ChatModelPicker } from "./-components/ChatModelPicker";

export const Route = createFileRoute("/_authenticated/_chat/new")({
	loader: ({ context }) => context.queryClient.query(chatQueries.defaultSelection()),
	head: () => ({ meta: [{ title: "New chat · localghost" }] }),
	component: NewChatPage,
});

function NewChatPage() {
	return <NewChat renderModelPicker={(props) => <ChatModelPicker {...props} />} />;
}
