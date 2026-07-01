import { code } from "@streamdown/code";
import type { UIMessage } from "@tanstack/ai-client";
import { Streamdown } from "streamdown";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Message, MessageContent } from "#/components/ui/message";
import { ToolCalls } from "#/features/chat/components/ChatMessage/ToolCalls";
import { partsText } from "#/features/chat/lib/message-text";

type ChatMessageProps = { message: UIMessage; isStreaming?: boolean };
export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
	const content = partsText(message.parts);

	if (message.role === "user") {
		return (
			<Message align="end" role="article" aria-label="Your message">
				<MessageContent>
					<Bubble variant="default">
						<BubbleContent>{content}</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
		);
	}

	const toolCalls = message.parts.filter((p) => p.type === "tool-call");

	return (
		<Message role="article" aria-label="Assistant message">
			<MessageContent>
				{content && (
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
			</MessageContent>
		</Message>
	);
}
