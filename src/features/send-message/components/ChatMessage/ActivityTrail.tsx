import type { UIMessage } from "@tanstack/ai-client";
import { ActivityMarker } from "#/features/send-message/components/ActivityMarker";
import { ReasoningStep } from "#/features/send-message/components/ChatMessage/ReasoningStep";
import { ToolCallStep } from "#/features/send-message/components/ChatMessage/ToolCallStep";

type ActivityTrailProps = {
	message: UIMessage;
	isStreaming?: boolean;
	/** Whether the local model is still loading, shown on the pending head. */
	warming?: boolean;
};

/**
 * An assistant message's train of thought: reasoning and tool steps rendered in
 * order as markers, capped by a live "Thinking" head while the model works
 * between steps. The answer text is rendered separately by the caller.
 */
export function ActivityTrail({ message, isStreaming, warming }: ActivityTrailProps) {
	const { parts } = message;
	const lastPart = parts.at(-1);
	// A step is "live" when it owns the spinner itself, so the head stays hidden.
	const tailActive =
		lastPart?.type === "thinking" ||
		(lastPart?.type === "tool-call" && lastPart.output === undefined) ||
		(lastPart?.type === "text" && lastPart.content.length > 0);
	const showHead = Boolean(isStreaming) && !tailActive;

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
			return [<ToolCallStep key={part.id} toolCall={part} isStreaming={isStreaming} />];
		}
		return [];
	});

	if (steps.length === 0 && !showHead) return null;

	return (
		<div className="flex flex-col gap-2">
			{steps}
			{showHead && <ActivityMarker label={warming ? "Warming up the model" : "Thinking"} />}
		</div>
	);
}
