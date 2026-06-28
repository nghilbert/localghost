import { createFileRoute } from "@tanstack/react-router";
import { NewChat } from "#/features/chat/components/NewChat";

export const Route = createFileRoute("/_authenticated/new")({
	component: NewChatPage,
});

function NewChatPage() {
	return <NewChat />;
}
