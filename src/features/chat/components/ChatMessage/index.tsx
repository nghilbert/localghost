import { code } from "@streamdown/code";
import type { UIMessage } from "@tanstack/ai-client";
import { CircleAlertIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Button } from "#/components/ui/button";
import { Message, MessageContent, MessageFooter } from "#/components/ui/message";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { Reasoning } from "#/features/chat/components/ChatMessage/Reasoning";
import { ToolCalls } from "#/features/chat/components/ChatMessage/ToolCalls";
import { partsText, strandedToolCall } from "#/features/chat/lib/messages";

type ChatMessageProps = {
	message: UIMessage;
	isStreaming?: boolean;
	/** Provided only for the last assistant message; re-requests the response. */
	onRegenerate?: () => void;
};
export function ChatMessage({ message, isStreaming, onRegenerate }: ChatMessageProps) {
	const content = partsText(message.parts);

	if (message.role === "user") {
		return (
			<Message align="end" role="article" aria-label="Your message">
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

	const thinking = message.parts.filter((p) => p.type === "thinking");
	const toolCalls = message.parts.filter((p) => p.type === "tool-call");
	const lastPart = message.parts.at(-1);
	// A reply that is only a tool-call JSON blob means the model wrote the call
	// as text instead of invoking it; explain that instead of printing the JSON.
	const strandedTool = !isStreaming && content ? strandedToolCall(content) : null;

	return (
		<Message role="article" aria-label="Assistant message">
			<MessageContent>
				{thinking.map((part, idx) => (
					<Reasoning
						// Thinking parts carry no id; the reconciled part keeps its position.
						key={`thinking-${idx.toString()}`}
						content={part.content}
						isThinking={Boolean(isStreaming && part === lastPart)}
					/>
				))}

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

				<ToolCalls toolCalls={toolCalls} isStreaming={isStreaming} />

				{!isStreaming && content && (
					<MessageFooter className="gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Copy message"
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
