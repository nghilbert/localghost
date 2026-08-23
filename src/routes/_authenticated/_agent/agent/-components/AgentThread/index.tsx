import { useChat } from "@tanstack/ai-react";
import { useEffect, useRef, useState } from "react";
import { createAgentConnection } from "#/routes/_authenticated/_agent/agent/-lib/agent-client";
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
import type { CodeAgentSessionDetail } from "#/shared/domain/code-agent/code-agent.functions";
import {
	type CodeAgentApproval,
	isCodeAgentApproval,
} from "#/shared/domain/code-agent/code-agent-approval";
import { useApproveCodeAgentCommand } from "#/shared/domain/code-agent/use-code-agent-sessions";
import { awaitingAssistantResponse } from "#/shared/domain/conversation/messages";
import { CommandApprovalMarker } from "./CommandApprovalMarker";

type AgentThreadProps = { session: CodeAgentSessionDetail };

/**
 * A session's transcript. The session id is the thread id, which is the whole contract
 * with the stream route: everything else the run needs lives on the session row.
 */
export function AgentThread({ session }: AgentThreadProps) {
	const [connection] = useState(() => createAgentConnection());
	const [approvals, setApprovals] = useState<CodeAgentApproval[]>([]);
	const approveCommand = useApproveCodeAgentCommand();

	const { messages, status, isLoading, error, reload, sendMessage, stop } = useChat({
		connection,
		persistence: true,
		threadId: session.id,
		onCustomEvent: (eventType, data) => {
			if (!isCodeAgentApproval(eventType, data)) return;
			setApprovals((prev) =>
				prev.some((pending) => pending.approvalId === data.approvalId) ? prev : [...prev, data],
			);
		},
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

	/** Allowing a command re-runs the turn the harness refused it on. */
	function handleApprove(approval: CodeAgentApproval) {
		approveCommand.mutate(
			{ id: session.id, approvalId: approval.approvalId },
			{
				onSuccess: () => {
					dismissApproval(approval.approvalId);
					void reload();
				},
			},
		);
	}

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
										isPending={approveCommand.isPending}
										onApprove={() => handleApprove(approval)}
										onDeny={() => dismissApproval(approval.approvalId)}
									/>
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
					stop={stop}
				/>
			</div>
		</div>
	);
}
