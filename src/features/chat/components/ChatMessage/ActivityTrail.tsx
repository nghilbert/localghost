import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { ACTIVITY_STATUS, type ActivityStatus } from "#/features/chat/components/activity-status";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";
import type {
	ChatInterrupts,
	ChatToolCall,
	ChatToolResult,
	ChatUIMessage,
} from "#/features/chat/lib/chat-tools";
import { isPending, toolPhase } from "#/features/chat/lib/tool-phase";
import { ReasoningStep } from "./ReasoningStep";
import { type ToolApprovalInterrupt, ToolCallStep } from "./ToolCallStep";

type ActivityTrailProps = {
	/** The reply's parts before its answer. */
	parts: ChatUIMessage["parts"];
	isStreaming?: boolean;
	/** Replaces the head row's status, e.g. while the model loads. */
	pendingStatus?: ActivityStatus;
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
 * What the model is doing between steps: reading the user's message before its first
 * output, reading the results of the tools it just called, or thinking.
 */
function waitingStatus(parts: ChatUIMessage["parts"]): ActivityStatus {
	if (parts.length === 0) return ACTIVITY_STATUS.readingMessage;
	const trailing: string[] = [];
	for (const part of parts.toReversed()) {
		if (part.type === "tool-result" || (part.type === "text" && !part.content)) continue;
		if (part.type !== "tool-call") break;
		trailing.push(part.name);
	}
	if (trailing.length === 0) return ACTIVITY_STATUS.thinking;
	if (trailing.every((name) => name === "read_url")) {
		return trailing.length > 1 ? ACTIVITY_STATUS.readingPages : ACTIVITY_STATUS.readingPage;
	}
	if (trailing.every((name) => name === "web_search")) return ACTIVITY_STATUS.readingSearchResults;
	return ACTIVITY_STATUS.readingResults;
}

/**
 * An assistant message's reasoning and tool steps in order, ending in a live row that says
 * what the model is doing while it works between steps. The answer text is rendered by the
 * caller.
 */
export function ActivityTrail({
	parts,
	isStreaming,
	pendingStatus,
	interrupts,
}: ActivityTrailProps) {
	const lastPart = parts.at(-1);
	const toolCalls = parts
		.filter((part): part is ChatToolCall => part.type === "tool-call")
		.map((call) => {
			const result = parts.find(
				(part): part is ChatToolResult =>
					part.type === "tool-result" && part.toolCallId === call.id,
			);
			const interrupt = interrupts?.find(
				(candidate): candidate is ToolApprovalInterrupt =>
					candidate.kind === "tool-approval" && candidate.toolCallId === call.id,
			);
			const pending =
				Boolean(interrupt) || isPending(toolPhase(call, result, Boolean(isStreaming)));
			return { call, result, interrupt, pending };
		});
	// A running step shows its own spinner, so the head row stays hidden. Tools can run in
	// parallel, so any of them may still be running.
	const stepActive =
		lastPart?.type === "thinking" ||
		(lastPart?.type === "text" && lastPart.content.length > 0) ||
		toolCalls.some(({ pending }) => pending);
	const showHead = Boolean(isStreaming) && !stepActive;
	const headSeconds = useElapsedSeconds(showHead);
	const head = showHead ? (pendingStatus ?? waitingStatus(parts)) : null;

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
		const tool = toolCalls.find(({ call }) => call === part);
		if (!tool) return [];
		return [
			<ToolCallStep
				key={tool.call.id}
				toolCall={tool.call}
				result={tool.result}
				isStreaming={isStreaming}
				interrupt={tool.interrupt}
			/>,
		];
	});

	if (steps.length === 0 && !showHead) return null;

	return (
		<div className={trailClassName}>
			{steps}
			{head && <ActivityMarker label={head.label} icon={<head.icon />} seconds={headSeconds} />}
		</div>
	);
}
