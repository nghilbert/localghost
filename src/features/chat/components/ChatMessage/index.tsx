import { code } from "@streamdown/code";
import type { UIMessage } from "@tanstack/ai-client";
import { BrainIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Message, MessageContent } from "#/components/ui/message";
import { MessageCollapsible } from "#/features/chat/components/ChatMessage/MessageCollapsible";
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
						<BubbleContent>
							<p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{content}</p>
						</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
		);
	}

	const reasoning = message.parts
		.filter((p) => p.type === "thinking")
		.map((p) => p.content)
		.join("\n");
	const toolCalls = message.parts.filter((p) => p.type === "tool-call");

	return (
		<Message role="article" aria-label="Assistant message">
			<MessageContent>
				{reasoning && (
					<MessageCollapsible icon={BrainIcon} label="Reasoning">
						<p className="whitespace-pre-wrap wrap-break-word px-3 py-2.5 leading-relaxed text-muted-foreground">
							{reasoning}
						</p>
					</MessageCollapsible>
				)}

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
