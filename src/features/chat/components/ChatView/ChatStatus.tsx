import type { ChatClientState, UIMessage } from "@tanstack/ai-client";
import { useQuery } from "@tanstack/react-query";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { modelRunStateQueryOptions } from "#/features/chat/lib/conversation.functions";

type ChatStatusProps = {
	conversationId: string;
	status: ChatClientState;
	messages: Array<UIMessage>;
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

/** Whether the last message is an assistant reply with anything on screen yet. */
function hasVisibleOutput(messages: Array<UIMessage>): boolean {
	const last = messages.at(-1);
	if (last?.role !== "assistant") return false;
	return last.parts.some(
		(part) =>
			((part.type === "text" || part.type === "thinking") && part.content.length > 0) ||
			part.type === "tool-call",
	);
}

/**
 * The conversation's single transient status row: a recoverable error alert, or a
 * live marker from the moment a response is requested until the model shows its
 * first output (text, reasoning, or a tool call) — nothing once visible output
 * streams or the chat is idle. While pending, an Ollama endpoint is polled for
 * whether the model is actually loaded, so a cold start reads "Warming up"
 * instead of a suspiciously long "Thinking".
 */
export function ChatStatus({ conversationId, status, messages, error, onRetry }: ChatStatusProps) {
	const pending = status === "submitted" || (status === "streaming" && !hasVisibleOutput(messages));
	const { data: runState } = useQuery({
		...modelRunStateQueryOptions(conversationId),
		enabled: pending,
		refetchInterval: 2_000,
	});

	if (pending) {
		return <ActivityMarker label={runState === "warming" ? "Warming up the model" : "Thinking"} />;
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
