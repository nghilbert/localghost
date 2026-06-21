import type { ChatClientState } from "@tanstack/ai-client";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { ChatBubble } from "#/features/chat/components/ChatBubble";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";

type Props = {
	status: ChatClientState;
	error: Error | undefined;
	isWarming: boolean;
	warmSeconds: number;
	onRetry: () => void;
};

/**
 * Turns a raw runner/provider error into a short, human explanation. Local
 * runners (e.g. an iGPU Vulkan crash) surface as `unexpected EOF` once the
 * llama-server process aborts mid-stream — which is recoverable on a retry.
 */
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
 * The conversation's single transient status row, rendered at the end of the
 * message list: a recoverable error alert, a "Thinking" bubble while a request
 * is in flight with no tokens yet, or a "Warming up" bubble while a local model
 * loads before the first send. Nothing once the model is streaming or idle.
 */
export function ChatStatus({ status, error, isWarming, warmSeconds, onRetry }: Props) {
	const seconds = useElapsedSeconds(status === "submitted");
	const failure = status === "error" ? humanizeError(error?.message ?? "") : null;

	const content = failure ? (
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
	) : status === "submitted" ? (
		<ChatBubble side="assistant" pending seconds={seconds}>
			Thinking
		</ChatBubble>
	) : isWarming ? (
		<ChatBubble side="assistant" pending seconds={warmSeconds}>
			Warming up the model
		</ChatBubble>
	) : null;

	if (!content) return null;
	return <div className="px-4 py-3">{content}</div>;
}
