import type { QueuedMessage } from "@tanstack/ai-client";
import { XIcon } from "lucide-react";
import { Bubble, BubbleContent } from "#/features/chat/components/Bubble";
import { ActionButton } from "#/features/chat/components/ChatMessage/ActionButton";
import { Message, MessageContent, MessageFooter } from "#/features/chat/components/Message";

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

/** A message waiting for the current reply to finish before it sends. */
export function QueuedMessageItem({ item, onCancel }: QueuedMessageItemProps) {
	const text = queuedMessageText(item.content);
	return (
		<Message align="end" role="article" aria-label="Queued message">
			<MessageContent>
				<Bubble className="opacity-60">
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
						onClick={() => onCancel(item.id)}
					/>
				</MessageFooter>
			</MessageContent>
		</Message>
	);
}
