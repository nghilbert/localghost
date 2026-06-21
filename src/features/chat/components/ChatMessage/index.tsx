import { code } from "@streamdown/code";
import type { UIMessage } from "@tanstack/ai-client";
import { BrainIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import { ChatBubble } from "#/features/chat/components/ChatBubble";
import { MessageCollapsible } from "#/features/chat/components/ChatMessage/MessageCollapsible";
import { ToolCalls } from "#/features/chat/components/ChatMessage/ToolCalls";
import { partsText } from "#/features/chat/lib/message-text";

type ChatMessageProps = { message: UIMessage; isStreaming?: boolean };
export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
	const content = partsText(message.parts);

	if (message.role === "user") {
		return (
			<article aria-label="Your message" className="flex justify-end px-4 py-2">
				<ChatBubble side="user">
					<p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{content}</p>
				</ChatBubble>
			</article>
		);
	}

	const reasoning = message.parts
		.filter((p) => p.type === "thinking")
		.map((p) => p.content)
		.join("\n");
	const toolCalls = message.parts.filter((p) => p.type === "tool-call");

	return (
		<article aria-label="Assistant message" className="group flex flex-col gap-1.5 px-4 py-3">
			{reasoning && (
				<MessageCollapsible icon={BrainIcon} label="Reasoning">
					<p className="whitespace-pre-wrap wrap-break-word px-3 py-2.5 leading-relaxed text-muted-foreground">
						{reasoning}
					</p>
				</MessageCollapsible>
			)}

			{content && (
				<ChatBubble side="assistant">
					<Streamdown
						plugins={{ code }}
						linkSafety={{ enabled: false }}
						caret="block"
						isAnimating={isStreaming}
					>
						{content}
					</Streamdown>
				</ChatBubble>
			)}

			<ToolCalls toolCalls={toolCalls} isStreaming={isStreaming} />
		</article>
	);
}
