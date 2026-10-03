import type { ChatClientState, UIMessage } from "@tanstack/ai-client";
import { Link } from "@tanstack/react-router";
import { LibraryIcon, RefreshCwIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { Alert } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { ButtonLink } from "#/components/ui/button-link";
import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { ACTIVITY_STATUS, type ActivityStatus } from "#/features/chat/components/activity-status";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";
import { describeChatError } from "#/features/chat/lib/chat-errors";

type ChatStatusProps = {
	status: ChatClientState;
	messages: Array<UIMessage>;
	/** Replaces the waiting row's status, e.g. while the model loads. */
	pendingStatus?: ActivityStatus;
	/** The live run's error, or the last saved run's after a reload. */
	error: string | undefined;
	onRetry: () => void;
	/** Set when the last user message has no reply, to offer generating one. */
	onGenerate?: () => void;
};

type FailureAlertProps = { message: string; onRetry: () => void };

function FailureAlert({ message, onRetry }: FailureAlertProps) {
	const failure = describeChatError(message);
	return (
		<Alert.Root color="danger">
			<TriangleAlertIcon />
			<Alert.Title>{failure.title}</Alert.Title>
			<Alert.Description>{failure.description}</Alert.Description>
			{failure.remedy !== "none" && (
				<Alert.Action>
					{failure.remedy === "library" ? (
						<ButtonLink
							size="sm"
							color="neutral"
							variant="outlined"
							render={<Link to="/library" />}
						>
							<LibraryIcon />
							Open Library
						</ButtonLink>
					) : (
						<Button size="sm" color="neutral" variant="outlined" onClick={onRetry}>
							<RefreshCwIcon />
							Try again
						</Button>
					)}
				</Alert.Action>
			)}
		</Alert.Root>
	);
}

/** The live row before the reply appears, or an error with a retry. */
export function ChatStatus({
	status,
	messages,
	pendingStatus,
	error,
	onRetry,
	onGenerate,
}: ChatStatusProps) {
	const awaiting =
		(status === "submitted" || status === "streaming") && messages.at(-1)?.role !== "assistant";
	const seconds = useElapsedSeconds(awaiting);

	if (awaiting) {
		const { label, icon: Icon } = pendingStatus ?? ACTIVITY_STATUS.readingMessage;
		return <ActivityMarker label={label} icon={<Icon />} seconds={seconds} />;
	}

	if (status === "error" || (onGenerate && error !== undefined)) {
		return <FailureAlert message={error ?? ""} onRetry={onGenerate ?? onRetry} />;
	}

	if (onGenerate) {
		return (
			<Alert.Root>
				<SparklesIcon />
				<Alert.Title>This conversation is waiting on a response</Alert.Title>
				<Alert.Description>Generate a reply to your last message.</Alert.Description>
				<Alert.Action>
					<Button size="sm" color="neutral" variant="outlined" onClick={onGenerate}>
						<SparklesIcon />
						Generate response
					</Button>
				</Alert.Action>
			</Alert.Root>
		);
	}

	return null;
}
