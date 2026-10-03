import { CopyIcon, PencilIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Button } from "#/components/ui/button";
import { InputGroup } from "#/components/ui/input-group";
import { Bubble, BubbleContent } from "#/features/chat/components/Bubble";
import { Message, MessageContent, MessageFooter } from "#/features/chat/components/Message";
import type { ChatUIMessage } from "#/features/chat/lib/chat-tools";
import {
	messageDocumentSources,
	messageImageSources,
	partsText,
} from "#/features/chat/lib/messages";
import { copyToClipboard } from "#/lib/clipboard";
import { ActionButton } from "./ActionButton";
import { DocumentList } from "./DocumentList";
import { ImageGrid } from "./ImageGrid";

type UserMessageProps = {
	message: ChatUIMessage;
	/** Replaces the text and resends. Absent when editing is not allowed. */
	onEditResend?: (content: string) => void;
};

/** A user's message: its attachments and text bubble, with copy and edit-and-resend. */
export function UserMessage({ message, onEditResend }: UserMessageProps) {
	const content = partsText(message.parts);
	const imageSources = messageImageSources(message.parts);
	const documentSources = messageDocumentSources(message.parts);
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState(content);

	function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
		if (event.key === "Escape") {
			setIsEditing(false);
			setDraft(content);
		} else if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			submitEdit();
		}
	}

	function submitEdit() {
		const trimmed = draft.trim();
		if (!trimmed) return;
		setIsEditing(false);
		onEditResend?.(trimmed);
	}

	return (
		<Message align="end" role="article" aria-label="Your message">
			<MessageContent>
				{imageSources.length > 0 && <ImageGrid sources={imageSources} />}
				{documentSources.length > 0 && <DocumentList documents={documentSources} />}
				{isEditing ? (
					<InputGroup.Root>
						<InputGroup.Textarea
							autoFocus
							aria-label="Edit message"
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onKeyDown={handleKeyDown}
							className="max-h-50"
						/>
					</InputGroup.Root>
				) : (
					content && (
						<Bubble>
							<BubbleContent>
								<p className="whitespace-pre-wrap">{content}</p>
							</BubbleContent>
						</Bubble>
					)
				)}
				{isEditing ? (
					<MessageFooter className="justify-end gap-2">
						<Button
							color="neutral"
							variant="quiet"
							size="sm"
							onClick={() => {
								setIsEditing(false);
								setDraft(content);
							}}
						>
							Cancel
						</Button>
						<Button size="sm" onClick={submitEdit}>
							Save & resend
						</Button>
					</MessageFooter>
				) : (
					content && (
						<MessageFooter className="justify-end gap-1 opacity-0 transition-opacity pointer-coarse:opacity-100 focus-within:opacity-100 group-hover/message:opacity-100">
							<ActionButton
								icon={<CopyIcon />}
								ariaLabel="Copy message"
								tooltip="Copy"
								onClick={() => copyToClipboard(content)}
							/>
							{onEditResend && (
								<ActionButton
									icon={<PencilIcon />}
									ariaLabel="Edit message"
									tooltip="Edit & resend"
									onClick={() => {
										setDraft(content);
										setIsEditing(true);
									}}
								/>
							)}
						</MessageFooter>
					)
				)}
			</MessageContent>
		</Message>
	);
}
