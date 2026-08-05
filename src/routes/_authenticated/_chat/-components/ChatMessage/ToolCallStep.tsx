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
import { useState } from "react";
import { ActivityMarker } from "#/routes/_authenticated/_chat/-components/ActivityMarker";
import type { ChatInterrupts } from "#/routes/_authenticated/_chat/-components/ChatThread";
import { useStepDuration } from "#/routes/_authenticated/_chat/-hooks/use-step-duration";
import { Button } from "#/shared/components/ui/button";
import { Marker, MarkerContent, MarkerIcon } from "#/shared/components/ui/marker";

export type ToolApprovalInterrupt = Extract<ChatInterrupts[number], { kind: "tool-approval" }>;

export type ToolCall = Extract<UIMessage["parts"][number], { type: "tool-call" }>;

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
export const TOOL_DISPLAY: Record<string, ToolDisplay> = {
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
	delete_memory: {
		icon: BrainIcon,
		running: () => "Delete a memory?",
		done: () => "Deleted a memory",
	},
};

export function display(name: string): ToolDisplay {
	return TOOL_DISPLAY[name] ?? { icon: TerminalIcon, running: () => `${name}…`, done: () => name };
}

function outputText(output: ToolCall["output"]): string {
	if (output == null) return "";
	return typeof output === "string" ? output : JSON.stringify(output, null, 2);
}

type ToolCallStepProps = {
	toolCall: ToolCall;
	isStreaming?: boolean;
	/** The pending approval interrupt for this call, if any. */
	interrupt?: ToolApprovalInterrupt;
};

/**
 * One tool step of the train of thought: a live marker with an elapsed timer
 * while the call runs, then a marker whose output reveals on click once it
 * resolves. A call that needs approval pauses on an Approve/Deny marker instead.
 */
export function ToolCallStep({ toolCall, isStreaming, interrupt }: ToolCallStepProps) {
	const { icon: Icon, running, done } = display(toolCall.name);
	const input = callInput(toolCall);
	const active = Boolean(isStreaming) && toolCall.output === undefined;
	const { seconds } = useStepDuration(active);
	const [open, setOpen] = useState(false);

	if (interrupt) {
		return (
			<Marker data-testid="tool-approval-marker">
				<MarkerIcon>
					<Icon />
				</MarkerIcon>
				<MarkerContent className="flex items-center gap-2">
					{running(input)}
					<Button
						size="xs"
						variant="outline"
						data-testid="tool-approval-approve-button"
						onClick={() => interrupt.resolveInterrupt(true)}
					>
						<CheckIcon />
						Approve
					</Button>
					<Button
						size="xs"
						variant="outline"
						data-testid="tool-approval-deny-button"
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
		return <ActivityMarker label={running(input)} icon={Icon} seconds={seconds} />;
	}

	const output = outputText(toolCall.output);
	if (!output) {
		return (
			<Marker data-testid="activity-trail-marker">
				<MarkerIcon>
					<Icon />
				</MarkerIcon>
				<MarkerContent>{done(input)}</MarkerContent>
			</Marker>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<Marker
				data-testid="activity-trail-marker"
				className="w-fit"
				render={<Button variant="ghost" onClick={() => setOpen(!open)} />}
			>
				<MarkerIcon>
					<Icon />
				</MarkerIcon>
				<MarkerContent className="flex items-center gap-1 hover:text-foreground">
					{done(input)}
					<ChevronRightIcon
						className="size-3 transition-transform data-[open=true]:rotate-90"
						data-open={open}
					/>
				</MarkerContent>
			</Marker>
			{open && (
				<pre
					data-testid="tool-call-step-output"
					className="ml-2 max-h-56 overflow-y-auto border-l pl-3 whitespace-pre-wrap wrap-break-word font-mono text-xs leading-relaxed text-muted-foreground"
				>
					{output}
				</pre>
			)}
		</div>
	);
}
