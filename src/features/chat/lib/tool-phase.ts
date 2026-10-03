import type { ChatToolCall, ChatToolResult } from "./chat-tools";

/** Where a tool call is, from the user's point of view. Approval is told by its interrupt. */
export type ToolPhase = "choosing" | "running" | "done" | "failed" | "denied" | "stopped";

/** Whether the model is still writing the call's arguments. */
export function isChoosing(call: ChatToolCall): boolean {
	return call.state === "awaiting-input" || call.state === "input-streaming";
}

/**
 * A tool call's phase, from TanStack's call state and its result. A call with no outcome
 * once the reply stops streaming was cut off, so it reads as stopped rather than done.
 */
export function toolPhase(
	call: ChatToolCall,
	result: ChatToolResult | undefined,
	isStreaming: boolean,
): ToolPhase {
	if (result?.outcome === "denied") return "denied";
	if (result?.outcome === "cancelled") return "stopped";
	if (result?.state === "error" || call.state === "error") return "failed";
	if (call.output !== undefined || result || call.state === "complete") return "done";
	if (!isStreaming) return "stopped";
	return isChoosing(call) ? "choosing" : "running";
}

/** Whether the phase is still in progress. */
export function isPending(phase: ToolPhase): boolean {
	return phase === "choosing" || phase === "running";
}
