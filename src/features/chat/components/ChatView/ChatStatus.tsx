import type { ChatClientState } from "@tanstack/ai-client";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";

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
 * Inline conversation status: an animated thinking indicator while the model
 * warms up (request sent, no tokens yet) and a recoverable error alert when a
 * run fails.
 */
export function ChatStatus({ status, error, onRetry }: Props) {
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
				<div
					role="status"
					aria-label="Assistant is thinking"
					className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3"
				>
					<span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.3s]" />
					<span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.15s]" />
					<span className="size-2 animate-bounce rounded-full bg-muted-foreground/40" />
				</div>
			</div>
		);
	}

	return null;
}
