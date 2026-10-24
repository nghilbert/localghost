import { createFileRoute } from "@tanstack/react-router";
import { chatQueries } from "#/features/chat/chat.queries";
import { NewChat } from "#/features/chat/components/NewChat";

export const Route = createFileRoute("/_authenticated/_chat/new")({
	loader: ({ context }) => context.queryClient.query(chatQueries.defaultSelection()),
	head: () => ({ meta: [{ title: "New chat · localghost" }] }),
	component: NewChat,
});
