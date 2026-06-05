import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "#/features/chat/components/ChatView";
import { sessionQueryOptions } from "#/features/chat/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(sessionQueryOptions(params.sessionId));
	},
	component: SessionPage,
});

function SessionPage() {
	const { sessionId } = Route.useParams();
	const { data: session } = useSuspenseQuery(sessionQueryOptions(sessionId));
	return <ChatView key={session.id} session={session} />;
}
