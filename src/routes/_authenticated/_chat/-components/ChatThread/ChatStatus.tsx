import type { ChatClientState, UIMessage } from "@tanstack/ai-client";
import { RefreshCwIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { ActivityMarker } from "#/routes/_authenticated/_chat/-components/ActivityMarker";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/shared/components/ui/alert";
import { Button } from "#/shared/components/ui/button";

type ChatStatusProps = {
	status: ChatClientState;
	messages: Array<UIMessage>;
	/** Overrides the pending head's "Thinking" label (warming up, host unreachable). */
	pendingLabel?: string;
	error: Error | undefined;
	onRetry: () => void;
	/** When set, the transcript ends on an unanswered user turn: offer to generate a reply. */
	onGenerate?: () => void;
};

/** Turns a raw runner/provider error into a short, human explanation; a crashed local runner surfaces as `unexpected EOF` and is recoverable on retry. */
function humanizeError(message: string): { title: string; description: string } {
	if (/unexpected eof|device.?lost|core dumped|aborted|econnreset|fetch failed/i.test(message)) {
		return {
			title: "The model stopped unexpectedly",
			description:
				"The model runner crashed mid-response and is likely reloading. Give it a few seconds, then try again.",
		};
	}
	// OpenAI-compat: "does not support tools"; OpenRouter: "No endpoints found that support tool use".
	if (
		/(not |n't )support(s|ed)? tool|tools? (is |are |use )?not supported|no endpoints found that support tool/i.test(
			message,
		)
	) {
		return {
			title: "This model can't use tools",
			description:
				"Turn the tools off in the Tools menu for this message, or switch to a tool-capable model, then try again.",
		};
	}
	if (/unauthorized|\b401\b/i.test(message)) {
		return {
			title: "Your session expired",
			description: "Refresh the page and sign in again to keep chatting.",
		};
	}
	return { title: "Something went wrong", description: message };
}

/**
 * Trailing status slot: the pending head shown before the assistant message
 * exists (the in-message trail takes over once it does), or a recoverable error
 * alert. `pendingLabel` replaces "Thinking" on a cold local-model start.
 */
export function ChatStatus({
	status,
	messages,
	pendingLabel,
	error,
	onRetry,
	onGenerate,
}: ChatStatusProps) {
	const awaiting =
		(status === "submitted" || status === "streaming") && messages.at(-1)?.role !== "assistant";

	if (awaiting) {
		return <ActivityMarker label={pendingLabel ?? "Thinking"} />;
	}

	if (onGenerate) {
		return (
			<Alert>
				<SparklesIcon />
				<AlertTitle>This conversation is waiting on a response</AlertTitle>
				<AlertDescription>Generate a reply to your last message.</AlertDescription>
				<AlertAction>
					<Button size="sm" variant="outline" onClick={onGenerate}>
						<SparklesIcon />
						Generate response
					</Button>
				</AlertAction>
			</Alert>
		);
	}

	if (status === "error") {
		const failure = humanizeError(error?.message ?? "");
		return (
			<Alert variant="destructive">
				<TriangleAlertIcon />
				<AlertTitle>{failure.title}</AlertTitle>
				<AlertDescription>{failure.description}</AlertDescription>
				<AlertAction>
					<Button size="sm" variant="outline" onClick={onRetry}>
						<RefreshCwIcon />
						Try again
					</Button>
				</AlertAction>
			</Alert>
		);
	}

	return null;
}
