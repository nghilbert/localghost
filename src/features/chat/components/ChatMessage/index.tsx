import { code } from "@streamdown/code";
import type { UIMessage } from "@tanstack/ai-client";
import { BrainIcon, TerminalIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import { ChatBubble } from "#/features/chat/components/ChatBubble";
import { MessageCollapsible } from "#/features/chat/components/ChatMessage/CollapsibleDetails";
import { SpeakButton } from "#/features/chat/components/ChatMessage/SpeakButton";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";
import { partsText } from "#/features/chat/lib/message-text";

type ChatMessageProps = { message: UIMessage; isStreaming?: boolean };
export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
	const content = partsText(message.parts);
	const toolCalls = message.parts.filter((p) => p.type === "tool-call");
	const toolRunning = Boolean(isStreaming && toolCalls.some((tc) => tc.output === undefined));
	const toolSeconds = useElapsedSeconds(toolRunning);

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
				<ChatBubble side="assistant" asChild>
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

			{toolCalls.length > 0 && (
				<div className="space-y-1.5">
					{toolCalls.map((tc) =>
						isStreaming && tc.output === undefined ? (
							<ChatBubble key={tc.id} side="assistant" pending seconds={toolSeconds}>
								Running {tc.name}
							</ChatBubble>
						) : (
							<MessageCollapsible key={tc.id} icon={TerminalIcon} label={tc.name}>
								<pre className="whitespace-pre-wrap wrap-break-word px-3 py-2.5 font-mono leading-relaxed text-muted-foreground">
									{tc.output == null
										? ""
										: typeof tc.output === "string"
											? tc.output
											: JSON.stringify(tc.output, null, 2)}
								</pre>
							</MessageCollapsible>
						),
					)}
				</div>
			)}

			{!isStreaming && content && (
				<div className="flex items-center gap-1">
					<SpeakButton text={content} />
				</div>
			)}
		</article>
	);
}
