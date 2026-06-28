import type { UIMessage } from "@tanstack/ai-client";
import { BrainIcon, GlobeIcon, LinkIcon, type LucideIcon, TerminalIcon } from "lucide-react";
import { Marker, MarkerContent, MarkerIcon } from "#/components/ui/marker";
import { Spinner } from "#/components/ui/spinner";
import { MessageCollapsible } from "#/features/chat/components/ChatMessage/MessageCollapsible";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";

type ToolCall = Extract<UIMessage["parts"][number], { type: "tool-call" }>;

/** Friendly icon + running/done labels per tool, so chat shows activity, not raw call names. */
const TOOL_DISPLAY: Record<string, { icon: LucideIcon; running: string; done: string }> = {
	web_search: { icon: GlobeIcon, running: "Searching the web…", done: "Searched the web" },
	read_url: { icon: LinkIcon, running: "Reading page…", done: "Read page" },
	manage_memory: { icon: BrainIcon, running: "Updating memory…", done: "Memory" },
};

function display(name: string) {
	return TOOL_DISPLAY[name] ?? { icon: TerminalIcon, running: `${name}…`, done: name };
}

function outputText(output: ToolCall["output"]): string {
	if (output == null) return "";
	return typeof output === "string" ? output : JSON.stringify(output, null, 2);
}

type ToolCallsProps = { toolCalls: ToolCall[]; isStreaming?: boolean };

/**
 * Renders an assistant message's tool calls: a live bubble with an elapsed timer
 * while a call is in flight, then a collapsible of its output once it resolves.
 * Owns the timer so it only ticks while a call is actually pending.
 */
export function ToolCalls({ toolCalls, isStreaming }: ToolCallsProps) {
	const isRunning = Boolean(isStreaming && toolCalls.some((tc) => tc.output === undefined));
	const seconds = useElapsedSeconds(isRunning);

	if (toolCalls.length === 0) return null;

	return (
		<div className="space-y-1.5">
			{toolCalls.map((tc) => {
				const { icon, running, done } = display(tc.name);
				return isStreaming && tc.output === undefined ? (
					<Marker key={tc.id} role="status">
						<MarkerIcon>
							<Spinner />
						</MarkerIcon>
						<MarkerContent>
							{running}
							{seconds ? <span className="tabular-nums opacity-70"> · {seconds}s</span> : null}
						</MarkerContent>
					</Marker>
				) : (
					<MessageCollapsible key={tc.id} icon={icon} label={done}>
						<pre className="whitespace-pre-wrap wrap-break-word px-3 py-2.5 font-mono leading-relaxed text-muted-foreground">
							{outputText(tc.output)}
						</pre>
					</MessageCollapsible>
				);
			})}
		</div>
	);
}
