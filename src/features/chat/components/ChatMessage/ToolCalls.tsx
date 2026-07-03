import type { UIMessage } from "@tanstack/ai-client";
import { BrainIcon, GlobeIcon, LinkIcon, type LucideIcon, TerminalIcon } from "lucide-react";
import { Textarea } from "#/components/ui/textarea";
import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { MessageStep } from "#/features/chat/components/ChatMessage/MessageStep";

type ToolCall = Extract<UIMessage["parts"][number], { type: "tool-call" }>;

/** The call's parsed input, falling back to the raw arguments string mid-stream. */
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
	add: { running: "Saving a memory…", done: "Saved a memory" },
	search: { running: "Searching memories…", done: "Recalled memories" },
	list: { running: "Listing memories…", done: "Listed memories" },
	delete: { running: "Deleting a memory…", done: "Deleted a memory" },
};

type ToolDisplay = {
	icon: LucideIcon;
	running: (input: unknown) => string;
	done: (input: unknown) => string;
};

/** Labels each call with what it actually did (query, host, action), not just the tool name. */
const TOOL_DISPLAY: Record<string, ToolDisplay> = {
	web_search: {
		icon: GlobeIcon,
		running: (input) => {
			const query = searchQuery(input);
			return query ? `Searching the web for "${query}"…` : "Searching the web…";
		},
		done: (input) => {
			const query = searchQuery(input);
			return query ? `Searched the web for "${query}"` : "Searched the web";
		},
	},
	read_url: {
		icon: LinkIcon,
		running: (input) => {
			const host = urlHost(input);
			return host ? `Reading ${host}…` : "Reading page…";
		},
		done: (input) => {
			const host = urlHost(input);
			return host ? `Read ${host}` : "Read page";
		},
	},
	manage_memory: {
		icon: BrainIcon,
		running: (input) => MEMORY_LABELS[memoryAction(input) ?? ""]?.running ?? "Updating memory…",
		done: (input) => MEMORY_LABELS[memoryAction(input) ?? ""]?.done ?? "Memory",
	},
};

function display(name: string): ToolDisplay {
	return TOOL_DISPLAY[name] ?? { icon: TerminalIcon, running: () => `${name}…`, done: () => name };
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
				const input = callInput(tc);
				return isStreaming && tc.output === undefined ? (
					<ActivityMarker key={tc.id} label={running(input)} />
				) : (
					<MessageStep key={tc.id} icon={icon} title={done(input)}>
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
