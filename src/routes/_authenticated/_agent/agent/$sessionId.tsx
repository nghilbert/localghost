import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AgentThread } from "#/routes/_authenticated/_agent/agent/-components/AgentThread";
import { WorkspacePanel } from "#/routes/_authenticated/_agent/agent/-components/WorkspacePanel";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "#/shared/components/ui/resizable";
import { Spinner } from "#/shared/components/ui/spinner";
import { codeAgentSessionQueryOptions } from "#/shared/domain/code-agent/code-agent.functions";

export const Route = createFileRoute("/_authenticated/_agent/agent/$sessionId")({
	loader: async ({ params, context }) => {
		// No `staleTime: "static"` here: `hasRun` has to refetch, or the Generate
		// affordance never appears once a session's first run has finished.
		const session = await context.queryClient.query(codeAgentSessionQueryOptions(params.sessionId));
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
	return (
		<ResizablePanelGroup className="min-h-0">
			<ResizablePanel defaultSize={22} minSize={15} maxSize={40}>
				<WorkspacePanel workspacePath={session.workspacePath} />
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={78} className="flex min-h-0 flex-col">
				{/* Remounting per session resets `useChat`'s connection, which is not reactive. */}
				<AgentThread key={session.id} session={session} />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

function SessionPending() {
	return (
		<div className="flex items-center justify-center">
			<Spinner />
		</div>
	);
}
