import { code } from "@streamdown/code";
import type { UIMessage } from "@tanstack/ai-client";
import { Streamdown } from "streamdown";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Message, MessageContent } from "#/components/ui/message";
import { Reasoning } from "#/features/chat/components/ChatMessage/Reasoning";
import { ToolCalls } from "#/features/chat/components/ChatMessage/ToolCalls";
import { partsText } from "#/features/chat/lib/messages";

type ChatMessageProps = { message: UIMessage; isStreaming?: boolean };
export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
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
