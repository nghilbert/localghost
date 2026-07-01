import type { UIMessage } from "@tanstack/ai-client";
import { BrainIcon, GlobeIcon, LinkIcon, type LucideIcon, TerminalIcon } from "lucide-react";
import { Textarea } from "#/components/ui/textarea";
import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { MessageStep } from "#/features/chat/components/ChatMessage/MessageStep";

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
 * Renders an assistant message's tool calls: a live marker with an elapsed timer
 * while a call is in flight, then a collapsible step with its output once it
 * resolves.
 */
export function ToolCalls({ toolCalls, isStreaming }: ToolCallsProps) {
	if (toolCalls.length === 0) return null;

	return (
		<>
			{toolCalls.map((tc) => {
				const { icon, running, done } = display(tc.name);
				return isStreaming && tc.output === undefined ? (
					<ActivityMarker key={tc.id} label={running} />
				) : (
					<MessageStep key={tc.id} icon={icon} title={done}>
						<Textarea
							readOnly
							className="max-h-56 border-t whitespace-pre-wrap wrap-break-word px-3 py-2.5 font-mono leading-relaxed text-muted-foreground"
							value={outputText(tc.output)}
						/>
					</MessageStep>
				);
			})}
		</>
	);
}
