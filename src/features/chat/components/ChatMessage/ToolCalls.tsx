import type { UIMessage } from "@tanstack/ai-client";
import {
	BrainIcon,
	ChevronRightIcon,
	GlobeIcon,
	LinkIcon,
	type LucideIcon,
	TerminalIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Marker, MarkerContent, MarkerIcon } from "#/components/ui/marker";
import { Spinner } from "#/components/ui/spinner";
import { Textarea } from "#/components/ui/textarea";
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
		<>
			{toolCalls.map((tc) => {
				const { icon: DisplayIcon, running, done } = display(tc.name);
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
					<Collapsible
						key={tc.id}
						className="overflow-hidden rounded-lg border bg-muted/30 text-xs"
					>
						<CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-medium text-muted-foreground transition-colors hover:bg-muted/50">
							<DisplayIcon size={12} className="shrink-0" />
							<span className="flex-1">{done}</span>
							<ChevronRightIcon
								size={12}
								className="transition-transform group-data-[state=open]:rotate-90"
							/>
						</CollapsibleTrigger>
						<CollapsibleContent asChild>
							<Textarea
								readOnly
								className="max-h-56 border-t whitespace-pre-wrap wrap-break-word px-3 py-2.5 font-mono leading-relaxed text-muted-foreground"
							>
								{outputText(tc.output)}
							</Textarea>
						</CollapsibleContent>
					</Collapsible>
				);
			})}
		</>
	);
}
