import type { ComponentProps } from "react";
import { AssistantMessage } from "./AssistantMessage";
import { UserMessage } from "./UserMessage";

type ChatMessageProps = ComponentProps<typeof AssistantMessage> &
	ComponentProps<typeof UserMessage>;

/** One chat message, rendered by its role: a user bubble, or an assistant's reply. */
export function ChatMessage({ onEditResend, ...props }: ChatMessageProps) {
	if (props.message.role === "user") {
		return <UserMessage message={props.message} onEditResend={onEditResend} />;
	}
	return <AssistantMessage {...props} />;
}
