import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AgentThread } from "#/routes/_authenticated/_agent/agent/-components/AgentThread";
import { Button } from "#/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/shared/components/ui/empty";
import { Spinner } from "#/shared/components/ui/spinner";
import { codeAgentSessionQueryOptions } from "#/shared/domain/code-agent/code-agent.functions";

export const Route = createFileRoute("/_authenticated/_agent/agent/$sessionId")({
	loader: async ({ params, context }) => {
		const session = await context.queryClient.ensureQueryData(
			codeAgentSessionQueryOptions(params.sessionId),
		);
		return { title: session.title };
	},
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData ? `${loaderData.title} · localghost` : "localghost" }],
	}),
	pendingComponent: SessionPending,
	errorComponent: SessionError,
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

function SessionError() {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyTitle>Couldn't load this session</EmptyTitle>
				<EmptyDescription>It may have been deleted, or the server is unreachable.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button variant="outline" render={<Link to="/agent" />}>
					Back to code agent
				</Button>
			</EmptyContent>
		</Empty>
	);
}
