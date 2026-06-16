import { createFileRoute, redirect } from "@tanstack/react-router";
import { createSession, sessionsQueryOptions } from "#/features/chat/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/")({
	// Landing goes straight to chat: open the most recent session, or create one
	// for a brand-new account so there is always a conversation to drop into.
	loader: async ({ context }) => {
		const sessions = await context.queryClient.ensureQueryData(sessionsQueryOptions());
		const mostRecent = sessions[0];
		if (mostRecent) {
			throw redirect({ to: "/sessions/$sessionId", params: { sessionId: mostRecent.id } });
		}
		const session = await createSession({ data: { name: "New Chat" } });
		await context.queryClient.invalidateQueries({ queryKey: ["sessions"] });
		throw redirect({ to: "/sessions/$sessionId", params: { sessionId: session.id } });
	},
});
