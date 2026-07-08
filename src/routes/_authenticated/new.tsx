import { createFileRoute } from "@tanstack/react-router";
import { NewChatView } from "./-page/NewChatView";

export const Route = createFileRoute("/_authenticated/new")({
	head: () => ({ meta: [{ title: "New chat · localghost" }] }),
	component: NewChatPage,
});

function NewChatPage() {
	return (
		<div className="w-full h-full min-h-0 mx-auto max-w-4xl">
			<NewChatView />
		</div>
	);
}
