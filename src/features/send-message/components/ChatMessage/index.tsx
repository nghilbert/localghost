import { code } from "@streamdown/code";
import type { UIMessage } from "@tanstack/ai-client";
import { CircleAlertIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { partsText, strandedToolCall } from "#/entities/conversation/messages";
import { ActivityTrail } from "#/features/send-message/components/ChatMessage/ActivityTrail";
import { Alert, AlertDescription, AlertTitle } from "#/shared/ui/alert";
import { Bubble, BubbleContent } from "#/shared/ui/bubble";
import { Button } from "#/shared/ui/button";
import { Message, MessageContent, MessageFooter } from "#/shared/ui/message";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/shared/ui/tooltip";

type ChatMessageProps = {
	message: UIMessage;
	isStreaming?: boolean;
	/** True while the last assistant message's local model is still loading. */
	warming?: boolean;
	/** Provided only for the last assistant message; re-requests the response. */
	onRegenerate?: () => void;
};
export function ChatMessage({ message, isStreaming, warming, onRegenerate }: ChatMessageProps) {
	const content = partsText(message.parts);

	if (message.role === "user") {
		return (
			<Message align="end" role="article" aria-label="Your message" data-testid="chat-message">
				<MessageContent>
					<Bubble variant="default">
						<BubbleContent>
							<p className="whitespace-pre-wrap">{content}</p>
						</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
		);
	}

	// A reply that is only a tool-call JSON blob means the model wrote the call
	// as text instead of invoking it; explain that instead of printing the JSON.
	const strandedTool = !isStreaming && content ? strandedToolCall(content) : null;

	return (
		<Message role="article" aria-label="Assistant message" data-testid="chat-message">
			<MessageContent>
				<ActivityTrail message={message} isStreaming={isStreaming} warming={warming} />

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

				{!isStreaming && content && (
					<MessageFooter className="gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Copy message"
										data-testid="copy-message-button"
										onClick={() => {
											navigator.clipboard
												.writeText(content)
												.then(() => toast.success("Copied to clipboard"))
												.catch(() => toast.error("Couldn't copy to clipboard"));
										}}
									/>
								}
							>
								<CopyIcon />
							</TooltipTrigger>
							<TooltipContent>Copy</TooltipContent>
						</Tooltip>
						{onRegenerate && (
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label="Regenerate response"
											data-testid="regenerate-button"
											onClick={onRegenerate}
										/>
									}
								>
									<RefreshCwIcon />
								</TooltipTrigger>
								<TooltipContent>Regenerate</TooltipContent>
							</Tooltip>
						)}
					</MessageFooter>
				)}
			</MessageContent>
		</Message>
	);
}
