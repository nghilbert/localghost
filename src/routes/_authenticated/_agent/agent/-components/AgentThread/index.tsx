import { fetchServerSentEvents } from "@tanstack/ai-client";
import { useChat } from "@tanstack/ai-react";
import { useEffect, useRef, useState } from "react";
import { ChatInput } from "#/routes/_authenticated/-components/ChatInput";
import { ChatMessage } from "#/routes/_authenticated/-components/ChatMessage";
import { ChatStatus } from "#/routes/_authenticated/-components/ChatStatus";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "#/shared/components/ui/message-scroller";
import { type CodeAgentApproval, isCodeAgentApproval } from "#/shared/domain/code-agent/approval";
import {
	type CodeAgentSessionDetail,
	requestCodeAgentRunCancel,
} from "#/shared/domain/code-agent/code-agent.functions";
import { type CodeAgentDiff, isCodeAgentDiff } from "#/shared/domain/code-agent/diff";
import { awaitingAssistantResponse } from "#/shared/domain/conversation/messages";
import { CommandApprovalMarker } from "./CommandApprovalMarker";
import { WorkspaceDiffMarker } from "./WorkspaceDiffMarker";

type AgentThreadProps = { session: CodeAgentSessionDetail };

/**
 * A session's transcript. The session id is the thread id, which is the whole contract
 * with the stream route: everything else the run needs lives on the session row.
 */
export function AgentThread({ session }: AgentThreadProps) {
	const [connection] = useState(() => fetchServerSentEvents("/api/agent/stream"));
	// Component state, not `useChat`'s native `pendingInterrupts`: the sandbox's approval
	// payload carries no `approval.id`, so it rides a custom event instead (see
	// `SANDBOX_APPROVAL_EVENT`'s comment in policy.server.ts) and a reload loses it.
	const [approvals, setApprovals] = useState<CodeAgentApproval[]>([]);
	// Approvals granted for the next run only. The harness denies an `ask` action and asks
	// the client to re-run with a decision, so these ride the run and are never stored.
	const [grantedApprovalIds, setGrantedApprovalIds] = useState<string[]>([]);
	// One entry per run that touched the workspace. Like approvals, this is a custom event
	// with no place in `useChat`'s own state, so it does not survive a reload either. The
	// diff itself carries no id (`path` is always `"."`), so one is assigned on arrival.
	const [diffs, setDiffs] = useState<{ id: string; diff: CodeAgentDiff }[]>([]);

	// `useChat` syncs `forwardedProps` in an effect, so a grant reaches the client one
	// commit after it is made; re-running any sooner would send the run without it.
	const grantsSent = useRef(0);

	// A grant is scoped to the one run it was sent for; clearing it here (rather than on
	// the next approval) is what keeps it from silently becoming a standing allow-list
	// across every later run in the session.
	function clearGrantedApprovals() {
		setGrantedApprovalIds((prev) => (prev.length === 0 ? prev : []));
		grantsSent.current = 0;
	}

	const { messages, status, isLoading, error, reload, sendMessage, stop, runId } = useChat({
		connection,
		persistence: true,
		threadId: session.id,
		forwardedProps: { approvedApprovalIds: grantedApprovalIds },
		onCustomEvent: (eventType, data) => {
			if (isCodeAgentApproval(eventType, data)) {
				setApprovals((prev) =>
					prev.some((pending) => pending.approvalId === data.approvalId) ? prev : [...prev, data],
				);
			} else if (isCodeAgentDiff(eventType, data)) {
				setDiffs((prev) => [...prev, { id: crypto.randomUUID(), diff: data }]);
			}
		},
		onFinish: clearGrantedApprovals,
		onError: clearGrantedApprovals,
	});
	const isStreaming = isLoading || status === "submitted" || status === "streaming";

	// The seeded first message has no reply yet, so ask for one once the hydrated
	// transcript settles. Gated on `hasRun` so reopening a session that merely ended on
	// a user turn does not silently set a file-editing agent going again.
	const responseRequested = useRef(false);
	useEffect(() => {
		if (session.hasRun || responseRequested.current) return;
		if (status !== "ready" || !awaitingAssistantResponse(messages)) return;
		responseRequested.current = true;
		void reload();
	});

	function dismissApproval(approvalId: string) {
		setApprovals((prev) => prev.filter((pending) => pending.approvalId !== approvalId));
	}

	/**
	 * Records the cancel before disconnecting: a dropped connection alone never aborts the
	 * run, so the server tells Stop from a reload by this record, which has to land first.
	 * A failed record still disconnects, so the run detaches instead of the button doing nothing.
	 */
	function handleStop() {
		const recorded = runId ? requestCodeAgentRunCancel({ data: runId }) : Promise.resolve();
		// Swallowed so a failed record cannot escape the click as an unhandled rejection.
		void recorded.catch(() => {}).finally(stop);
	}

	/** Allowing a command re-runs the turn the harness refused it on. */
	function handleApprove(approval: CodeAgentApproval) {
		setGrantedApprovalIds((prev) =>
			prev.includes(approval.approvalId) ? prev : [...prev, approval.approvalId],
		);
		dismissApproval(approval.approvalId);
	}

	useEffect(() => {
		if (grantedApprovalIds.length === grantsSent.current) return;
		grantsSent.current = grantedApprovalIds.length;
		void reload();
	});

	const canGenerate = session.hasRun && status === "ready" && awaitingAssistantResponse(messages);

	return (
		<div className="flex min-h-0 flex-col">
			<MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
				<MessageScroller className="flex-1">
					<MessageScrollerViewport aria-label="Code agent session" className="p-4">
						<MessageScrollerContent aria-busy={isStreaming}>
							{messages.map((msg, idx) => (
								<MessageScrollerItem
									key={msg.id}
									messageId={msg.id}
									scrollAnchor={msg.role === "user"}
								>
									<ChatMessage
										message={msg}
										isStreaming={
											isStreaming && idx === messages.length - 1 && msg.role === "assistant"
										}
									/>
								</MessageScrollerItem>
							))}
							{approvals.map((approval) => (
								<MessageScrollerItem key={approval.approvalId}>
									<CommandApprovalMarker
										approval={approval}
										disabled={isStreaming}
										onApprove={() => handleApprove(approval)}
										onDeny={() => dismissApproval(approval.approvalId)}
									/>
								</MessageScrollerItem>
							))}
							{diffs.map(({ id, diff }) => (
								<MessageScrollerItem key={id}>
									<WorkspaceDiffMarker diff={diff} />
								</MessageScrollerItem>
							))}
							<MessageScrollerItem>
								<ChatStatus
									status={status}
									messages={messages}
									pendingLabel="Working"
									error={error}
									onRetry={reload}
									onGenerate={canGenerate ? () => void reload() : undefined}
								/>
							</MessageScrollerItem>
						</MessageScrollerContent>
					</MessageScrollerViewport>
					<MessageScrollerButton />
				</MessageScroller>
			</MessageScrollerProvider>
			<div className="px-4 pb-4">
				<ChatInput
					isStreaming={isStreaming}
					selection={{ endpointId: session.endpointId, model: session.model }}
					locked
					sendMessage={(content) => void sendMessage(content)}
					stop={handleStop}
				/>
			</div>
		</div>
	);
}
