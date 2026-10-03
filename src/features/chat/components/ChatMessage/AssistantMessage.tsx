import { CircleAlertIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { Alert } from "#/components/ui/alert";
import type { ActivityStatus } from "#/features/chat/components/activity-status";
import { Bubble, BubbleContent } from "#/features/chat/components/Bubble";
import { ChatMarkdown } from "#/features/chat/components/ChatMarkdown";
import { Message, MessageContent, MessageFooter } from "#/features/chat/components/Message";
import { useStepDuration } from "#/features/chat/hooks/use-step-duration";
import type { ChatInterrupts, ChatUIMessage } from "#/features/chat/lib/chat-tools";
import { partsText, splitReply, strandedToolCall, turnSeconds } from "#/features/chat/lib/messages";
import { copyToClipboard } from "#/lib/clipboard";
import { formatSeconds } from "#/lib/format";
import { ActionButton } from "./ActionButton";
import { ActivityTrail } from "./ActivityTrail";

type AssistantMessageProps = {
	message: ChatUIMessage;
	isStreaming?: boolean;
	/** Replaces the live row's status, e.g. while the model loads. */
	pendingStatus?: ActivityStatus;
	/** The user stopped this reply, so its footer says so. */
	stopped?: boolean;
	/** Asks for a new reply. Only the last assistant message gets it. */
	onRegenerate?: () => void;
	/** Pending approvals for this message's tool calls. */
	interrupts?: ChatInterrupts;
};

/** How long the reply took, and whether the user stopped it. */
function describeDuration(seconds: number, stopped?: boolean): string | null {
	const elapsed = seconds > 0 ? formatSeconds(seconds) : null;
	if (stopped) return elapsed ? `Stopped after ${elapsed}` : "Stopped";
	return elapsed && `Worked for ${elapsed}`;
}

/** An assistant's reply: its steps and answer, with copy and regenerate. */
export function AssistantMessage({
	message,
	isStreaming,
	pendingStatus,
	stopped,
	onRegenerate,
	interrupts,
}: AssistantMessageProps) {
	// The server's run timings arrive only on load, so a live reply times itself.
	const { duration: liveSeconds } = useStepDuration(Boolean(isStreaming));
	const durationNote = describeDuration(turnSeconds(message) ?? liveSeconds, stopped);

	// A streaming reply's trailing thinking is still reasoning, not yet an answer.
	const { steps, answer } = isStreaming
		? { steps: message.parts, answer: partsText(message.parts) }
		: splitReply(message.parts);
	// Explains a tool call the model wrote as text instead of showing the JSON.
	const strandedTool = !isStreaming && answer ? strandedToolCall(answer) : null;

	return (
		<Message role="article" aria-label="Assistant message">
			<MessageContent>
				<ActivityTrail
					parts={steps}
					isStreaming={isStreaming}
					pendingStatus={pendingStatus}
					interrupts={interrupts}
				/>

				{strandedTool && (
					<Alert.Root>
						<CircleAlertIcon />
						<Alert.Title>
							The model wrote a call to "{strandedTool}" instead of running it
						</Alert.Title>
						<Alert.Description>
							That tool isn't available to it right now. Rephrase the message, or enable the
							matching tool from the Tools menu and try again.
						</Alert.Description>
					</Alert.Root>
				)}

				{answer && !strandedTool && (
					<Bubble variant="quiet">
						<BubbleContent>
							<ChatMarkdown isStreaming={isStreaming} caret={isStreaming}>
								{answer}
							</ChatMarkdown>
						</BubbleContent>
					</Bubble>
				)}

				{!isStreaming && (answer || stopped) && (
					<MessageFooter className="gap-1">
						{durationNote && (
							<span className="text-xs tabular-nums text-muted-fg">{durationNote}</span>
						)}
						<div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity pointer-coarse:opacity-100 focus-within:opacity-100 group-hover/message:opacity-100">
							{answer && (
								<ActionButton
									icon={<CopyIcon />}
									ariaLabel="Copy message"
									tooltip="Copy"
									onClick={() => copyToClipboard(answer)}
								/>
							)}
							{onRegenerate && (
								<ActionButton
									icon={<RefreshCwIcon />}
									ariaLabel="Regenerate response"
									tooltip="Regenerate"
									onClick={onRegenerate}
								/>
							)}
						</div>
					</MessageFooter>
				)}
			</MessageContent>
		</Message>
	);
}
