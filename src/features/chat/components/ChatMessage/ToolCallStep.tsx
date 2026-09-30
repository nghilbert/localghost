import type { UIMessage } from "@tanstack/ai-client";
import {
	BrainIcon,
	CheckIcon,
	ChevronRightIcon,
	GlobeIcon,
	LinkIcon,
	type LucideIcon,
	TerminalIcon,
	XIcon,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { Collapsible } from "#/components/ui/collapsible";
import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { Marker, MarkerContent, MarkerIcon } from "#/features/chat/components/Marker";
import { useStepDuration } from "#/features/chat/hooks/use-step-duration";
import type { ChatInterrupts } from "#/features/chat/lib/chat-tools";

/** A pending approval for a tool call. */
export type ToolApprovalInterrupt = Extract<ChatInterrupts[number], { kind: "tool-approval" }>;

/** A tool call part of a message. */
type ToolCall = Extract<UIMessage["parts"][number], { type: "tool-call" }>;

/** A tool result part of a message, matched to its call by `toolCallId`. */
export type ToolResult = Extract<UIMessage["parts"][number], { type: "tool-result" }>;

/** The call's parsed arguments, or the raw string while they are still streaming. */
function callInput(tc: ToolCall): unknown {
	if (tc.input !== undefined) return tc.input;
	try {
		return JSON.parse(tc.arguments);
	} catch {
		return null;
	}
}

function searchQuery(input: unknown): string | null {
	if (
		typeof input === "object" &&
		input !== null &&
		"query" in input &&
		typeof input.query === "string"
	) {
		return input.query;
	}
	return null;
}

function urlHost(input: unknown): string | null {
	if (typeof input !== "object" || input === null || !("url" in input)) return null;
	if (typeof input.url !== "string") return null;
	try {
		return new URL(input.url).hostname;
	} catch {
		return null;
	}
}

function memoryAction(input: unknown): string | null {
	if (
		typeof input === "object" &&
		input !== null &&
		"action" in input &&
		typeof input.action === "string"
	) {
		return input.action;
	}
	return null;
}

const MEMORY_LABELS: Record<string, { running: string; done: string }> = {
	add: { running: "Saving a memory...", done: "Saved a memory" },
	search: { running: "Searching memories...", done: "Recalled memories" },
	list: { running: "Listing memories...", done: "Listed memories" },
	delete: { running: "Deleting a memory...", done: "Deleted a memory" },
};

type ToolDisplay = {
	icon: LucideIcon;
	/** Names the call in a row for one that did not succeed, e.g. "Web search failed". */
	title: string;
	running: (input: unknown) => string;
	done: (input: unknown) => string;
};

/** How to label each tool's calls with what they did, such as the search query. */
const TOOL_DISPLAY: Record<string, ToolDisplay> = {
	web_search: {
		icon: GlobeIcon,
		title: "Web search",
		running: (input) => {
			const query = searchQuery(input);
			return query ? `Searching the web for "${query}"...` : "Searching the web...";
		},
		done: (input) => {
			const query = searchQuery(input);
			return query ? `Searched the web for "${query}"` : "Searched the web";
		},
	},
	read_url: {
		icon: LinkIcon,
		title: "Page read",
		running: (input) => {
			const host = urlHost(input);
			return host ? `Reading ${host}...` : "Reading page...";
		},
		done: (input) => {
			const host = urlHost(input);
			return host ? `Read ${host}` : "Read page";
		},
	},
	manage_memory: {
		icon: BrainIcon,
		title: "Memory update",
		running: (input) => MEMORY_LABELS[memoryAction(input) ?? ""]?.running ?? "Updating memory...",
		done: (input) => MEMORY_LABELS[memoryAction(input) ?? ""]?.done ?? "Memory",
	},
	delete_memory: {
		icon: BrainIcon,
		title: "Memory deletion",
		running: () => "Delete a memory?",
		done: () => "Deleted a memory",
	},
};

/** How to label a tool's calls, with a generic label for unknown tools. */
export function display(name: string): ToolDisplay {
	return (
		TOOL_DISPLAY[name] ?? {
			icon: TerminalIcon,
			title: name,
			running: () => `${name}...`,
			done: () => name,
		}
	);
}

/** The word after a tool's title for a call that did not succeed. */
function failureWord(outcome: ToolResult["outcome"]): string {
	if (outcome === "denied") return "denied";
	if (outcome === "cancelled") return "stopped";
	return "failed";
}

function outputText(output: ToolCall["output"]): string {
	if (output == null) return "";
	return typeof output === "string" ? output : JSON.stringify(output, null, 2);
}

type ToolCallStepProps = {
	toolCall: ToolCall;
	/** The call's result, which tells a denied, stopped or failed call apart from a finished one. */
	result?: ToolResult;
	isStreaming?: boolean;
	/** The call's pending approval, if any. */
	interrupt?: ToolApprovalInterrupt;
};

/**
 * A tool call: a timer while it runs, then a row that shows its output on click. A call
 * waiting for approval shows Approve and Deny instead, and one that did not succeed says
 * so, with the error on click.
 */
export function ToolCallStep({ toolCall, result, isStreaming, interrupt }: ToolCallStepProps) {
	const { icon: Icon, title, running, done } = display(toolCall.name);
	const input = callInput(toolCall);
	const active = Boolean(isStreaming) && toolCall.output === undefined && result === undefined;
	const { seconds } = useStepDuration(active);

	if (interrupt) {
		return (
			<Marker>
				<MarkerIcon>
					<Icon />
				</MarkerIcon>
				<MarkerContent className="flex items-center gap-2">
					{running(input)}
					<Button
						size="sm"
						color="neutral"
						variant="outlined"
						onClick={() => interrupt.resolveInterrupt(true)}
					>
						<CheckIcon />
						Approve
					</Button>
					<Button
						size="sm"
						color="neutral"
						variant="outlined"
						onClick={() => interrupt.resolveInterrupt(false)}
					>
						<XIcon />
						Deny
					</Button>
				</MarkerContent>
			</Marker>
		);
	}

	if (active) {
		return <ActivityMarker label={running(input)} icon={<Icon />} seconds={seconds} />;
	}

	const failed = result?.state === "error";
	const RowIcon = failed ? XIcon : Icon;
	const label = failed ? `${title} ${failureWord(result.outcome)}` : done(input);
	const output = failed ? (result.error ?? "") : outputText(toolCall.output);
	if (!output) {
		return (
			<Marker>
				<MarkerIcon>
					<RowIcon />
				</MarkerIcon>
				<MarkerContent>{label}</MarkerContent>
			</Marker>
		);
	}

	return (
		<Collapsible.Root className="flex flex-col gap-1.5">
			<Marker className="w-fit" render={<Collapsible.Trigger />}>
				<MarkerIcon>
					<RowIcon />
				</MarkerIcon>
				<MarkerContent className="flex items-center gap-1 hover:text-fg">
					{label}
					<ChevronRightIcon className="size-3 transition-transform in-data-panel-open:rotate-90" />
				</MarkerContent>
			</Marker>
			<Collapsible.Panel>
				<pre className="ml-2 max-h-56 overflow-y-auto pl-3 whitespace-pre-wrap wrap-break-word font-mono text-xs leading-relaxed text-muted-fg">
					{output}
				</pre>
			</Collapsible.Panel>
		</Collapsible.Root>
	);
}
