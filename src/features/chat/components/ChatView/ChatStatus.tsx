import type { ChatClientState } from "@tanstack/ai-client";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Marker, MarkerContent, MarkerIcon } from "#/components/ui/marker";
import { Spinner } from "#/components/ui/spinner";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";

type ChatStatusProps = {
	status: ChatClientState;
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

/** The conversation's single transient status row: a recoverable error alert, or a "Thinking" marker — nothing once streaming or idle. */
export function ChatStatus({ status, error, onRetry }: ChatStatusProps) {
	const seconds = useElapsedSeconds(status === "submitted");

	if (status === "submitted") {
		return (
			<Marker role="status">
				<MarkerIcon>
					<Spinner />
				</MarkerIcon>
				<MarkerContent>
					Thinking
					{seconds ? <span className="tabular-nums opacity-70"> · {seconds}s</span> : null}
				</MarkerContent>
			</Marker>
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

	if (status === "ready" || status === "streaming") {
		return null;
	}
}
