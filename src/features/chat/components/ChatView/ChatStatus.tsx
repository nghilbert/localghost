import type { ChatClientState } from "@tanstack/ai-client";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { ChatBubble } from "#/features/chat/components/ChatBubble";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";

type ChatStatusProps = {
	status: ChatClientState;
	error: Error | undefined;
	isWarming: boolean;
	warmSeconds: number;
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

/** The conversation's single transient status row: a recoverable error alert, a "Thinking" bubble, or a "Warming up" bubble — nothing once streaming or idle. */
export function ChatStatus({ status, error, isWarming, warmSeconds, onRetry }: ChatStatusProps) {
	const seconds = useElapsedSeconds(status === "submitted");

	switch (status) {
		case "error": {
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
		case "submitted":
			return (
				<ChatBubble side="assistant" pending seconds={seconds}>
					Thinking
				</ChatBubble>
			);
		default:
			if (!isWarming) return null;
			return (
				<ChatBubble side="assistant" pending seconds={warmSeconds}>
					Warming up the model
				</ChatBubble>
			);
	}
}
