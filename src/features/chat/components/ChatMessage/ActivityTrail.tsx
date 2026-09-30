import type { UIMessage } from "@tanstack/ai-client";
import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { SpinningBulbIcon } from "#/features/chat/components/BulbIcons";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";
import type { ChatInterrupts } from "#/features/chat/lib/chat-tools";
import { ReasoningStep } from "./ReasoningStep";
import { type ToolApprovalInterrupt, ToolCallStep, type ToolResult } from "./ToolCallStep";

type ActivityTrailProps = {
	/** The reply's parts before its answer. */
	parts: UIMessage["parts"];
	isStreaming?: boolean;
	/** Replaces the "Thinking" label, e.g. while the model loads. */
	pendingLabel?: string;
	/** Pending approvals for this message's tool calls. */
	interrupts?: ChatInterrupts;
};

// One line joins each step's icon to the next, past any open output. It is the only line,
// since `--line` is translucent and overlapping lines would show darker.
const trailClassName = [
	"flex flex-col gap-3 *:relative",
	"*:after:absolute *:after:top-5 *:after:-bottom-3 *:after:left-2 *:after:w-px *:after:bg-line",
	"*:last:after:bottom-0 *:last:not-data-open:after:hidden",
].join(" ");

/**
 * An assistant message's reasoning and tool steps in order, ending in a live "Thinking"
 * row while the model works between steps. The answer text is rendered by the caller.
 */
export function ActivityTrail({
	parts,
	isStreaming,
	pendingLabel,
	interrupts,
}: ActivityTrailProps) {
	const lastPart = parts.at(-1);
	// A running step shows its own spinner, so the "Thinking" row stays hidden.
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
					// Thinking parts have no id, and keep their position.
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
			const result = parts.find(
				(candidate): candidate is ToolResult =>
					candidate.type === "tool-result" && candidate.toolCallId === part.id,
			);
			return [
				<ToolCallStep
					key={part.id}
					toolCall={part}
					result={result}
					isStreaming={isStreaming}
					interrupt={interrupt}
				/>,
			];
		}
		return [];
	});

	if (steps.length === 0 && !showHead) return null;

	return (
		<div className={trailClassName}>
			{steps}
			{showHead && (
				<ActivityMarker
					label={pendingLabel ?? "Thinking"}
					icon={<SpinningBulbIcon />}
					seconds={headSeconds}
				/>
			)}
		</div>
	);
}
