import type { UIMessage } from "@tanstack/ai-client";
import type { ChatInterrupts } from "#/routes/_authenticated/_chat/-lib/tool-stubs";
import { ActivityMarker } from "#/shared/components/ActivityMarker";
import { useElapsedSeconds } from "#/shared/hooks/use-elapsed-seconds";
import { ReasoningStep } from "./ReasoningStep";
import { type ToolApprovalInterrupt, ToolCallStep } from "./ToolCallStep";

type ActivityTrailProps = {
	message: UIMessage;
	isStreaming?: boolean;
	/** Overrides the pending head's "Thinking" label (warming up, host unreachable). */
	pendingLabel?: string;
	/** Pending interrupts (e.g. tool-approval requests) live on this message's tool calls. */
	interrupts?: ChatInterrupts;
};

/**
 * An assistant message's train of thought: reasoning and tool steps rendered in
 * order as markers, capped by a live "Thinking" head while the model works
 * between steps. The answer text is rendered separately by the caller.
 */
export function ActivityTrail({
	message,
	isStreaming,
	pendingLabel,
	interrupts,
}: ActivityTrailProps) {
	const { parts } = message;
	const lastPart = parts.at(-1);
	// A step is "live" when it owns the spinner itself, so the head stays hidden.
	const tailActive =
		lastPart?.type === "thinking" ||
		(lastPart?.type === "tool-call" && lastPart.output === undefined) ||
		(lastPart?.type === "text" && lastPart.content.length > 0);
	const showHead = Boolean(isStreaming) && !tailActive;
	const headSeconds = useElapsedSeconds(showHead);

	const steps = parts.flatMap((part, idx) => {
		if (part.type === "thinking") {
			return [
				<ReasoningStep
					// Thinking parts carry no id; the reconciled part keeps its position.
					key={`thinking-${idx.toString()}`}
					content={part.content}
					isThinking={Boolean(isStreaming) && part === lastPart}
				/>,
			];
		}
		if (part.type === "tool-call") {
			const interrupt = interrupts?.find(
				(candidate): candidate is ToolApprovalInterrupt =>
					candidate.kind === "tool-approval" && candidate.toolCallId === part.id,
			);
			return [
				<ToolCallStep
					key={part.id}
					toolCall={part}
					isStreaming={isStreaming}
					interrupt={interrupt}
				/>,
			];
		}
		return [];
	});

	if (steps.length === 0 && !showHead) return null;

	return (
		<div className="flex flex-col gap-2">
			{steps}
			{showHead && <ActivityMarker label={pendingLabel ?? "Thinking"} seconds={headSeconds} />}
		</div>
	);
}
