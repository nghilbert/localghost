import type { UIMessage } from "@tanstack/ai-client";
import { CircleAlertIcon, CopyIcon, PencilIcon, RefreshCwIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Alert } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { InputGroup } from "#/components/ui/input-group";
import { Bubble, BubbleContent } from "#/features/chat/components/Bubble";
import { ChatMarkdown } from "#/features/chat/components/ChatMarkdown";
import { Message, MessageContent, MessageFooter } from "#/features/chat/components/Message";
import { useStepDuration } from "#/features/chat/hooks/use-step-duration";
import type { ChatInterrupts } from "#/features/chat/lib/chat-tools";
import {
	messageDocumentSources,
	messageImageSources,
	partsText,
	strandedToolCall,
	turnSeconds,
} from "#/features/chat/lib/messages";
import { copyToClipboard } from "#/lib/clipboard";
import { formatSeconds } from "#/lib/format";
import { ActionButton } from "./ActionButton";
import { ActivityTrail } from "./ActivityTrail";
import { DocumentList } from "./DocumentList";
import { ImageGrid } from "./ImageGrid";

type ChatMessageProps = {
	message: UIMessage;
	isStreaming?: boolean;
	/** Replaces the "Thinking" label, e.g. while the model loads. */
	pendingLabel?: string;
	/** Asks for a new reply. Only the last assistant message gets it. */
	onRegenerate?: () => void;
	/** Replaces the text and resends. Absent when editing is not allowed. */
	onEditResend?: (content: string) => void;
	/** Pending approvals for this message's tool calls. */
	interrupts?: ChatInterrupts;
};
/** One chat message: a user bubble, or an assistant's steps and answer with actions. */
export function ChatMessage({
	message,
	isStreaming,
	pendingLabel,
	onRegenerate,
	onEditResend,
	interrupts,
}: ChatMessageProps) {
	const content = partsText(message.parts);
	const imageSources = messageImageSources(message.parts);
	const documentSources = messageDocumentSources(message.parts);
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState(content);
	// The server's run timings arrive only on load, so a live reply times itself.
	const { duration: liveSeconds } = useStepDuration(Boolean(isStreaming));
	const workedSeconds = turnSeconds(message) ?? liveSeconds;

	if (message.role === "user") {
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

	// Explains a tool call the model wrote as text instead of showing the JSON.
	const strandedTool = !isStreaming && content ? strandedToolCall(content) : null;

	return (
		<Message role="article" aria-label="Assistant message">
			<MessageContent>
				<ActivityTrail
					message={message}
					isStreaming={isStreaming}
					pendingLabel={pendingLabel}
					interrupts={interrupts}
				/>

				{strandedTool && (
					<Alert.Root>
						<CircleAlertIcon />
						<Alert.Title>
							The model wrote a call to "{strandedTool}" instead of running it
						</Alert.Title>
						<Alert.Description>
							That tool isn't available to it right now. Rephrase the message, or enable the
							matching tool from the Tools menu and try again.
						</Alert.Description>
					</Alert.Root>
				)}

				{content && !strandedTool && (
					<Bubble variant="quiet">
						<BubbleContent>
							<ChatMarkdown isStreaming={isStreaming} caret={isStreaming}>
								{content}
							</ChatMarkdown>
						</BubbleContent>
					</Bubble>
				)}

				{!isStreaming && content && (
					<MessageFooter className="gap-1">
						{workedSeconds > 0 && (
							<span className="text-xs tabular-nums text-muted-fg">
								Worked for {formatSeconds(workedSeconds)}
							</span>
						)}
						<div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity pointer-coarse:opacity-100 focus-within:opacity-100 group-hover/message:opacity-100">
							<ActionButton
								icon={<CopyIcon />}
								ariaLabel="Copy message"
								tooltip="Copy"
								onClick={() => copyToClipboard(content)}
							/>
							{onRegenerate && (
								<ActionButton
									icon={<RefreshCwIcon />}
									ariaLabel="Regenerate response"
									tooltip="Regenerate"
									onClick={onRegenerate}
								/>
							)}
						</div>
					</MessageFooter>
				)}
			</MessageContent>
		</Message>
	);
}
