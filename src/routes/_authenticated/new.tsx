import { createFileRoute } from "@tanstack/react-router";
import { NewChatView } from "#/features/chat/components/NewChatView";

export const Route = createFileRoute("/_authenticated/new")({
	component: NewChatPage,
});

function NewChatPage() {
	return (
		<div className="w-full h-full min-y-0 mx-auto max-w-4xl">
			<NewChatView />
		</div>
	);
}
