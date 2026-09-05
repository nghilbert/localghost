import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
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
import { Button, buttonVariants } from "#/shared/components/ui/button";
import {
	Item,
	ItemActions,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/shared/components/ui/item";
import { codeAgentSessionsQueryOptions } from "#/shared/domain/code-agent/code-agent.functions";
import { useDeleteCodeAgentSession } from "#/shared/domain/code-agent/use-sessions";

export const Route = createFileRoute("/_authenticated/_agent/agent/")({
	head: () => ({ meta: [{ title: "Code agent · localghost" }] }),
	// Nothing to list yet sends the user straight to the composer, same as the app root
	// redirecting to `/new` when there's no chat to show either.
	loader: async ({ context }) => {
		const sessions = await context.queryClient.query({
			...codeAgentSessionsQueryOptions(),
			staleTime: "static",
		});
		if (sessions.length === 0) throw redirect({ to: "/agent/new" });
	},
	component: CodeAgentPage,
});

/**
 * The code-agent surface's home: past sessions, plus a link to the composer page. A
 * top-level page rather than a chat tool, so a harness running shell commands cannot
 * destabilise the chat pipeline.
 */
function CodeAgentPage() {
	const navigate = useNavigate();
	const { data: sessions } = useSuspenseQuery(codeAgentSessionsQueryOptions());
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const deleteSession = useDeleteCodeAgentSession();

	const pendingDelete = sessions.find((session) => session.id === pendingDeleteId);

	return (
		<div className="flex min-h-0 flex-col overflow-auto p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-heading font-medium text-xl">Code agent sessions</h1>
				<Link to="/agent/new" className={buttonVariants()} data-testid="new-code-agent-session">
					<PlusIcon />
					New session
				</Link>
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
								if (!pendingDeleteId) return;
								// The list will come back empty; leave it the same way arriving at an
								// already-empty one does, rather than rendering a bare, sessionless page.
								const isLastSession = sessions.length === 1;
								deleteSession.mutate(pendingDeleteId, {
									onSuccess: () => {
										setPendingDeleteId(null);
										if (isLastSession) navigate({ to: "/agent/new" });
									},
								});
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
