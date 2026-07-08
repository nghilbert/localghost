import type { ChatClientState, UIMessage } from "@tanstack/ai-client";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { ActivityMarker } from "#/features/send-message/components/ActivityMarker";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/shared/ui/alert";
import { Button } from "#/shared/ui/button";

type ChatStatusProps = {
	status: ChatClientState;
	messages: Array<UIMessage>;
	warming: boolean;
	error: Error | undefined;
	onRetry: () => void;
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
 * alert. `warming` reads "Warming up" on a cold local-model start.
 */
export function ChatStatus({ status, messages, warming, error, onRetry }: ChatStatusProps) {
	const awaiting =
		(status === "submitted" || status === "streaming") && messages.at(-1)?.role !== "assistant";

	if (awaiting) {
		return <ActivityMarker label={warming ? "Warming up the model" : "Thinking"} />;
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
