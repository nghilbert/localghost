import type { QueuedMessage } from "@tanstack/ai-client";
import { XIcon } from "lucide-react";
import { ActionButton } from "#/routes/_authenticated/_chat/-components/ChatMessage/ActionButton";
import { Bubble, BubbleContent } from "#/shared/components/ui/bubble";
import { Message, MessageContent, MessageFooter } from "#/shared/components/ui/message";

/** The queued item's text, or a placeholder for an attachment-only send. */
export function queuedMessageText(content: QueuedMessage["content"]): string {
	if (typeof content === "string") return content;
	const parts = content.content;
	if (typeof parts === "string") return parts;
	return parts.flatMap((part) => (part.type === "text" ? [part.content] : [])).join("");
}

type QueuedMessageItemProps = {
	item: QueuedMessage;
	onCancel: (id: string) => void;
};

/** A user message waiting on the in-flight run to finish before it sends. */
export function QueuedMessageItem({ item, onCancel }: QueuedMessageItemProps) {
	const text = queuedMessageText(item.content);
	return (
		<Message align="end" role="article" aria-label="Queued message" data-testid="queued-message">
			<MessageContent>
				<Bubble variant="default" className="opacity-60">
					<BubbleContent>
						<p className="whitespace-pre-wrap">{text || "[attachment]"}</p>
					</BubbleContent>
				</Bubble>
				<MessageFooter className="justify-end gap-1">
					Queued
					<ActionButton
						icon={<XIcon />}
						ariaLabel="Cancel queued message"
						tooltip="Cancel"
						testId="cancel-queued-message-button"
						onClick={() => onCancel(item.id)}
					/>
				</MessageFooter>
			</MessageContent>
		</Message>
	);
}
