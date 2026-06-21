import type { UIMessage } from "@tanstack/ai-client";
import { TerminalIcon } from "lucide-react";
import { ChatBubble } from "#/features/chat/components/ChatBubble";
import { MessageCollapsible } from "#/features/chat/components/ChatMessage/MessageCollapsible";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";

type ToolCall = Extract<UIMessage["parts"][number], { type: "tool-call" }>;

function outputText(output: ToolCall["output"]): string {
	if (output == null) return "";
	return typeof output === "string" ? output : JSON.stringify(output, null, 2);
}

type ToolCallsProps = { toolCalls: ToolCall[]; isStreaming?: boolean };

/**
 * Renders an assistant message's tool calls: a live "Running…" bubble with an
 * elapsed timer while a call is in flight, then a collapsible of its output once
 * it resolves. Owns the timer so it only ticks while a call is actually pending.
 */
export function ToolCalls({ toolCalls, isStreaming }: ToolCallsProps) {
	const running = Boolean(isStreaming && toolCalls.some((tc) => tc.output === undefined));
	const seconds = useElapsedSeconds(running);

	if (toolCalls.length === 0) return null;

	return (
		<div className="space-y-1.5">
			{toolCalls.map((tc) =>
				isStreaming && tc.output === undefined ? (
					<ChatBubble key={tc.id} side="assistant" pending seconds={seconds}>
						Running {tc.name}
					</ChatBubble>
				) : (
					<MessageCollapsible key={tc.id} icon={TerminalIcon} label={tc.name}>
						<pre className="whitespace-pre-wrap wrap-break-word px-3 py-2.5 font-mono leading-relaxed text-muted-foreground">
							{outputText(tc.output)}
						</pre>
					</MessageCollapsible>
				),
			)}
		</div>
	);
}
