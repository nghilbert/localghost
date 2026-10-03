import {
	BanIcon,
	BrainIcon,
	CheckIcon,
	ChevronRightIcon,
	CircleAlertIcon,
	GlobeIcon,
	LinkIcon,
	type LucideIcon,
	SquareIcon,
	TerminalIcon,
	XIcon,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { Collapsible } from "#/components/ui/collapsible";
import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { Marker, MarkerContent, MarkerIcon } from "#/features/chat/components/Marker";
import { useStepDuration } from "#/features/chat/hooks/use-step-duration";
import type { ChatInterrupts, ChatToolCall, ChatToolResult } from "#/features/chat/lib/chat-tools";
import { isChoosing, isPending, type ToolPhase, toolPhase } from "#/features/chat/lib/tool-phase";

/** A pending approval for a tool call. */
export type ToolApprovalInterrupt = Extract<ChatInterrupts[number], { kind: "tool-approval" }>;

function clip(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** A URL as a short `host/path`, without `www.` or a trailing slash. */
export function urlLabel(url: string | undefined): string | null {
	if (!url || !URL.canParse(url)) return null;
	const { hostname, pathname } = new URL(url);
	return clip(`${hostname.replace(/^www\./, "")}${pathname.replace(/\/$/, "")}`, 40);
}

/** The page title on the first `# ` line of `read_url`'s output, unless it is only the URL. */
export function pageTitle(output: string): string | null {
	const heading = output
		.split("\n", 1)[0]
		?.match(/^# (.+)$/)?.[1]
		?.trim();
	if (!heading || URL.canParse(heading)) return null;
	return clip(heading, 60);
}

/** The icon for each phase, shared by every tool. `null` shows the tool's own icon. */
const PHASE_ICONS: Record<ToolPhase, LucideIcon | null> = {
	choosing: null,
	running: null,
	done: null,
	failed: CircleAlertIcon,
	denied: BanIcon,
	// Matches the stop button's icon.
	stopped: SquareIcon,
};

/** What a tool call says in each phase, from the user's point of view. */
type ToolLabels = {
	icon: LucideIcon;
	choosing: string;
	running: string;
	done: string;
	failed: string;
	/** For a tool that needs approval: the question it asks, and what a denied call says. */
	approval?: { question: string; denied: string };
};

/** A memory action's phrases, which its labels are built from. */
const MEMORY_ACTIONS = {
	add: { doing: "Saving a memory", did: "Saved a memory", verb: "save a memory" },
	search: { doing: "Searching memories", did: "Recalled memories", verb: "search memories" },
	list: { doing: "Listing memories", did: "Listed memories", verb: "list memories" },
};

/** Labels for a call, naming what it works on, such as the search query or the page. */
export function toolLabels(call: ChatToolCall, output: string): ToolLabels {
	// The model can name a tool that isn't defined, despite the typed union.
	const name: string = call.name;
	switch (call.name) {
		case "web_search": {
			const query = call.input?.query;
			const target = query ? ` for "${query}"` : "";
			return {
				icon: GlobeIcon,
				choosing: "Choosing what to search",
				running: `Searching the web${target}`,
				done: `Searched the web${target}`,
				failed: query ? `Couldn't search for "${query}"` : "Couldn't search the web",
			};
		}
		case "read_url": {
			const page = urlLabel(call.input?.url);
			const title = pageTitle(output);
			return {
				icon: LinkIcon,
				choosing: "Choosing a page to open",
				running: `Opening ${page ?? "a page"}`,
				done: title ? `Read "${title}"` : `Read ${page ?? "a page"}`,
				failed: `Couldn't open ${page ?? "the page"}`,
			};
		}
		case "manage_memory": {
			const action = call.input?.action;
			const phrases = action
				? MEMORY_ACTIONS[action]
				: { doing: "Updating memory", did: "Updated memory", verb: "update memory" };
			return {
				icon: BrainIcon,
				choosing: "Preparing to use memory",
				running: phrases.doing,
				done: phrases.did,
				failed: `Couldn't ${phrases.verb}`,
			};
		}
		case "delete_memory":
			return {
				icon: BrainIcon,
				choosing: "Preparing to delete a memory",
				running: "Deleting a memory",
				done: "Deleted a memory",
				failed: "Couldn't delete the memory",
				approval: {
					question: "Delete a memory?",
					denied: "You chose to keep the memory, so it wasn't deleted",
				},
			};
	}
	return {
		icon: TerminalIcon,
		choosing: `Preparing ${name}`,
		running: `Running ${name}`,
		done: `Ran ${name}`,
		failed: `${name} failed`,
		approval: { question: `Run ${name}?`, denied: `You chose not to run ${name}` },
	};
}

/** A label lowercased to continue a sentence. */
function lowerFirst(label: string): string {
	return label.charAt(0).toLowerCase() + label.slice(1);
}

function outputText(output: unknown): string {
	if (output == null) return "";
	return typeof output === "string" ? output : JSON.stringify(output, null, 2);
}

type ToolCallStepProps = {
	toolCall: ChatToolCall;
	/** The call's result, which tells a denied, stopped or failed call apart from a finished one. */
	result?: ChatToolResult;
	isStreaming?: boolean;
	/** The call's pending approval, if any. */
	interrupt?: ToolApprovalInterrupt;
};

/**
 * A tool call: a timer while the model writes it and while it runs, then a row that shows
 * its output on click. A call waiting for approval asks for it instead, and one
 * that failed, was denied or was stopped says so, with any error on click.
 */
export function ToolCallStep({ toolCall, result, isStreaming, interrupt }: ToolCallStepProps) {
	const phase = toolPhase(toolCall, result, Boolean(isStreaming));
	const output = outputText(toolCall.output ?? result?.content);
	const labels = toolLabels(toolCall, output);
	const { icon: Icon } = labels;
	const question = labels.approval?.question ?? labels.running;
	const { seconds } = useStepDuration(isPending(phase));

	if (interrupt) {
		return (
			<Marker>
				<MarkerIcon>
					<Icon />
				</MarkerIcon>
				<MarkerContent className="flex items-center gap-2">
					{question}
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

	if (phase === "choosing" || phase === "running") {
		const PhaseIcon = PHASE_ICONS[phase] ?? Icon;
		return <ActivityMarker label={labels[phase]} icon={<PhaseIcon />} seconds={seconds} />;
	}

	// A stopped row says what the call was doing when it stopped.
	const interrupted = isChoosing(toolCall)
		? lowerFirst(labels.choosing)
		: toolCall.state === "approval-requested"
			? "waiting for approval"
			: lowerFirst(labels.running);
	const { label, detail } = {
		done: { label: labels.done, detail: output },
		failed: { label: labels.failed, detail: result?.error ?? "" },
		denied: {
			label: labels.approval?.denied ?? `You chose not to let it ${lowerFirst(labels.running)}`,
			detail: "",
		},
		stopped: { label: `Stopped while ${interrupted}`, detail: "" },
	}[phase];
	const RowIcon = PHASE_ICONS[phase] ?? Icon;

	if (!detail) {
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
					{detail}
				</pre>
			</Collapsible.Panel>
		</Collapsible.Root>
	);
}
