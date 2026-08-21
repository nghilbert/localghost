import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { CodeAgentSessionForm } from "#/routes/_authenticated/_agent/agent/-components/CodeAgentSessionForm";
import { CodeAgentUnavailableNotice } from "#/routes/_authenticated/_agent/agent/-components/CodeAgentUnavailableNotice";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/shared/components/ui/alert-dialog";
import { Button } from "#/shared/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/shared/components/ui/dialog";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/shared/components/ui/empty";
import {
	Item,
	ItemActions,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/shared/components/ui/item";
import {
	codeAgentAvailabilityQueryOptions,
	codeAgentSessionsQueryOptions,
} from "#/shared/domain/code-agent/code-agent.functions";
import { useDeleteCodeAgentSession } from "#/shared/domain/code-agent/use-code-agent-sessions";

export const Route = createFileRoute("/_authenticated/_agent/agent/")({
	head: () => ({ meta: [{ title: "Code agent · localghost" }] }),
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(codeAgentSessionsQueryOptions()),
			context.queryClient.ensureQueryData(codeAgentAvailabilityQueryOptions()),
		]);
	},
	component: CodeAgentPage,
});

/**
 * The code-agent surface's home: past sessions plus a composer for a new one. A
 * top-level page rather than a chat tool, so a harness running shell commands cannot
 * destabilise the chat pipeline.
 */
function CodeAgentPage() {
	const navigate = useNavigate();
	const { data: sessions } = useSuspenseQuery(codeAgentSessionsQueryOptions());
	const { data: availability } = useSuspenseQuery(codeAgentAvailabilityQueryOptions());
	const [composerOpen, setComposerOpen] = useState(false);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const deleteSession = useDeleteCodeAgentSession();

	const harnessId = availability.availableHarnessIds[0];
	const pendingDelete = sessions.find((session) => session.id === pendingDeleteId);

	function onCreated(sessionId: string) {
		setComposerOpen(false);
		navigate({ to: "/agent/$sessionId", params: { sessionId } });
	}

	const composer = harnessId ? (
		<CodeAgentSessionForm harnessId={harnessId} onCreated={onCreated} />
	) : (
		<CodeAgentUnavailableNotice />
	);

	if (sessions.length === 0) {
		return (
			<Empty className="flex-1">
				<EmptyHeader>
					<EmptyTitle>Start a code-agent session</EmptyTitle>
					<EmptyDescription>
						The agent edits files directly in the workspace directory you point it at, and asks
						before running a command.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="w-full max-w-xl">{composer}</EmptyContent>
			</Empty>
		);
	}

	return (
		<div className="flex min-h-0 flex-col overflow-auto p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-heading font-medium text-xl">Code agent sessions</h1>
				<Button onClick={() => setComposerOpen(true)} data-testid="new-code-agent-session">
					<PlusIcon />
					New session
				</Button>
			</div>

			<ItemGroup>
				{sessions.map((session) => (
					<Item key={session.id} variant="outline">
						<Link
							to="/agent/$sessionId"
							params={{ sessionId: session.id }}
							className="flex flex-1 flex-col gap-1"
						>
							<ItemTitle>{session.title}</ItemTitle>
							<ItemDescription>{session.workspacePath}</ItemDescription>
						</Link>
						<ItemActions>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Delete session"
								data-testid="delete-code-agent-session"
								onClick={() => setPendingDeleteId(session.id)}
							>
								<Trash2Icon size={14} />
							</Button>
						</ItemActions>
					</Item>
				))}
			</ItemGroup>

			<Dialog open={composerOpen} onOpenChange={setComposerOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Start a code-agent session</DialogTitle>
					</DialogHeader>
					{composer}
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={pendingDeleteId !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDeleteId(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete "{pendingDelete?.title}"?</AlertDialogTitle>
						<AlertDialogDescription>
							Its transcript is deleted permanently. The files it edited stay as they are.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={deleteSession.isPending}
							data-testid="delete-code-agent-session-confirm"
							onClick={(event) => {
								event.preventDefault();
								if (pendingDeleteId) {
									deleteSession.mutate(pendingDeleteId, {
										onSuccess: () => setPendingDeleteId(null),
									});
								}
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
