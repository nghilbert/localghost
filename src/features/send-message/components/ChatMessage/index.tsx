import { code } from "@streamdown/code";
import type { UIMessage } from "@tanstack/ai-client";
import { CircleAlertIcon, CopyIcon, OctagonXIcon, PencilIcon, RefreshCwIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
	isInterrupted,
	messageImageSources,
	partsText,
	strandedToolCall,
} from "#/entities/conversation/messages";
import { ActivityTrail } from "#/features/send-message/components/ChatMessage/ActivityTrail";
import { MessageActionButton } from "#/features/send-message/components/ChatMessage/MessageActionButton";
import { MessageImages } from "#/features/send-message/components/ChatMessage/MessageImages";
import { Alert, AlertDescription, AlertTitle } from "#/shared/ui/alert";
import { Bubble, BubbleContent } from "#/shared/ui/bubble";
import { Button } from "#/shared/ui/button";
import { InputGroup, InputGroupTextarea } from "#/shared/ui/input-group";
import { Message, MessageContent, MessageFooter } from "#/shared/ui/message";

function copyToClipboard(text: string) {
	navigator.clipboard
		.writeText(text)
		.then(() => toast.success("Copied to clipboard"))
		.catch(() => toast.error("Couldn't copy to clipboard"));
}

type ChatMessageProps = {
	message: UIMessage;
	isStreaming?: boolean;
	/** Overrides the pending head's "Thinking" label (warming up, host unreachable). */
	pendingLabel?: string;
	/** Provided only for the last assistant message; re-requests the response. */
	onRegenerate?: () => void;
	/** Provided only when editing is allowed right now; replaces the text and resends. */
	onEditResend?: (content: string) => void;
};
export function ChatMessage({
	message,
	isStreaming,
	pendingLabel,
	onRegenerate,
	onEditResend,
}: ChatMessageProps) {
	const content = partsText(message.parts);
	const imageSources = messageImageSources(message.parts);
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState(content);

	if (message.role === "user") {
		function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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
			<Message align="end" role="article" aria-label="Your message" data-testid="chat-message">
				<MessageContent>
					{imageSources.length > 0 && <MessageImages sources={imageSources} />}
					{isEditing ? (
						<InputGroup className="w-full">
							<InputGroupTextarea
								autoFocus
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								onKeyDown={handleKeyDown}
								className="max-h-50 field-sizing-content resize-none"
								data-testid="edit-message-textarea"
							/>
						</InputGroup>
					) : (
						content && (
							<Bubble variant="default">
								<BubbleContent>
									<p className="whitespace-pre-wrap">{content}</p>
								</BubbleContent>
							</Bubble>
						)
					)}
					{isEditing ? (
						<MessageFooter className="justify-end gap-2">
							<Button
								variant="ghost"
								size="xs"
								data-testid="cancel-edit-button"
								onClick={() => {
									setIsEditing(false);
									setDraft(content);
								}}
							>
								Cancel
							</Button>
							<Button size="xs" data-testid="save-edit-button" onClick={submitEdit}>
								Save & resend
							</Button>
						</MessageFooter>
					) : (
						content && (
							<MessageFooter className="justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100">
								<MessageActionButton
									icon={<CopyIcon />}
									ariaLabel="Copy message"
									tooltip="Copy"
									testId="copy-user-message-button"
									onClick={() => copyToClipboard(content)}
								/>
								{onEditResend && (
									<MessageActionButton
										icon={<PencilIcon />}
										ariaLabel="Edit message"
										tooltip="Edit & resend"
										testId="edit-message-button"
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

	// A reply that is only a tool-call JSON blob means the model wrote the call
	// as text instead of invoking it; explain that instead of printing the JSON.
	const strandedTool = !isStreaming && content ? strandedToolCall(content) : null;
	const interrupted = !isStreaming && isInterrupted(message);

	return (
		<Message role="article" aria-label="Assistant message" data-testid="chat-message">
			<MessageContent>
				<ActivityTrail message={message} isStreaming={isStreaming} pendingLabel={pendingLabel} />

				{strandedTool && (
					<Alert>
						<CircleAlertIcon />
						<AlertTitle>
							The model wrote a call to "{strandedTool}" instead of running it
						</AlertTitle>
						<AlertDescription>
							That tool isn't available to it right now. Rephrase the message, or enable the
							matching tool from the Tools menu and try again.
						</AlertDescription>
					</Alert>
				)}

				{content && !strandedTool && (
					<Bubble variant="ghost">
						<BubbleContent>
							<Streamdown
								plugins={{ code }}
								linkSafety={{ enabled: false }}
								caret="block"
								isAnimating={isStreaming}
							>
								{content}
							</Streamdown>
						</BubbleContent>
					</Bubble>
				)}

				{interrupted && (
					<div
						data-testid="generation-stopped-note"
						className="flex items-center gap-1.5 text-xs text-muted-foreground"
					>
						<OctagonXIcon aria-hidden className="size-3.5" />
						Generation stopped
						{onRegenerate && (
							<Button
								variant="ghost"
								size="xs"
								data-testid="stopped-regenerate-button"
								onClick={onRegenerate}
							>
								<RefreshCwIcon />
								Regenerate
							</Button>
						)}
					</div>
				)}

				{!isStreaming && content && (
					<MessageFooter className="gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100">
						<MessageActionButton
							icon={<CopyIcon />}
							ariaLabel="Copy message"
							tooltip="Copy"
							testId="copy-message-button"
							onClick={() => copyToClipboard(content)}
						/>
						{onRegenerate && (
							<MessageActionButton
								icon={<RefreshCwIcon />}
								ariaLabel="Regenerate response"
								tooltip="Regenerate"
								testId="regenerate-button"
								onClick={onRegenerate}
							/>
						)}
					</MessageFooter>
				)}
			</MessageContent>
		</Message>
	);
}
