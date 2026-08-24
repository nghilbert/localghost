import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CodeAgentSessionForm } from "#/routes/_authenticated/_agent/agent/-components/CodeAgentSessionForm";
import { CodeAgentUnavailableNotice } from "#/routes/_authenticated/_agent/agent/-components/CodeAgentUnavailableNotice";
import { codeAgentAvailabilityQueryOptions } from "#/shared/domain/code-agent/code-agent.functions";

export const Route = createFileRoute("/_authenticated/_agent/agent/new")({
	head: () => ({ meta: [{ title: "New code-agent session · localghost" }] }),
	loader: ({ context }) => context.queryClient.ensureQueryData(codeAgentAvailabilityQueryOptions()),
	component: NewCodeAgentSessionPage,
});

/**
 * The code-agent composer's own page, not a dialog: the form (workspace browser,
 * endpoint, model, task) runs long enough to need a normal scrolling page.
 */
function NewCodeAgentSessionPage() {
	const navigate = useNavigate();
	const { data: availability } = useSuspenseQuery(codeAgentAvailabilityQueryOptions());
	const harnessId = availability.availableHarnessIds[0];

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
			<h1 className="font-heading font-medium text-xl">Start a code-agent session</h1>
			{harnessId ? (
				<CodeAgentSessionForm
					harnessId={harnessId}
					onCreated={(sessionId) => navigate({ to: "/agent/$sessionId", params: { sessionId } })}
				/>
			) : (
				<CodeAgentUnavailableNotice />
			)}
		</div>
	);
}
