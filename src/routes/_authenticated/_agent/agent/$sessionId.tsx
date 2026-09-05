import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AgentThread } from "#/routes/_authenticated/_agent/agent/-components/AgentThread";
import { Spinner } from "#/shared/components/ui/spinner";
import { codeAgentSessionQueryOptions } from "#/shared/domain/code-agent/code-agent.functions";

export const Route = createFileRoute("/_authenticated/_agent/agent/$sessionId")({
	loader: async ({ params, context }) => {
		const session = await context.queryClient.query({
			...codeAgentSessionQueryOptions(params.sessionId),
			staleTime: "static",
		});
		return { title: session.title };
	},
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData ? `${loaderData.title} · localghost` : "localghost" }],
	}),
	pendingComponent: SessionPending,
	component: CodeAgentSessionPage,
});

function CodeAgentSessionPage() {
	const { sessionId } = Route.useParams();
	const { data: session } = useSuspenseQuery(codeAgentSessionQueryOptions(sessionId));
	// Remounting per session resets `useChat`'s connection, which is not reactive.
	return <AgentThread key={session.id} session={session} />;
}

function SessionPending() {
	return (
		<div className="flex items-center justify-center">
			<Spinner />
		</div>
	);
}
