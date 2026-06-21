import type { ChatClientState } from "@tanstack/ai-client";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { StatusIndicator } from "#/features/chat/components/ChatView/StatusIndicator";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";

type Props = {
	status: ChatClientState;
	error: Error | undefined;
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
 * Inline conversation status: a thinking indicator while the request is in
 * flight with no tokens yet, and a recoverable error alert when a run fails.
 */
export function ChatStatus({ status, error, onRetry }: Props) {
	const seconds = useElapsedSeconds(status === "submitted");

	if (status === "error") {
		const { title, description } = humanizeError(error?.message ?? "");
		return (
			<div className="px-4 py-3">
				<Alert variant="destructive">
					<TriangleAlertIcon />
					<AlertTitle>{title}</AlertTitle>
					<AlertDescription>{description}</AlertDescription>
					<AlertAction>
						<Button size="sm" variant="outline" onClick={onRetry}>
							<RefreshCwIcon />
							Try again
						</Button>
					</AlertAction>
				</Alert>
			</div>
		);
	}

	if (status === "submitted") {
		return (
			<div className="px-4 py-3">
				<StatusIndicator label="Thinking" seconds={seconds} />
			</div>
		);
	}

	return null;
}
