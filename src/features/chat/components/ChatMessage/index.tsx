import { code } from "@streamdown/code";
import type { UIMessage } from "@tanstack/ai-client";
import { BrainIcon, TerminalIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import { MessageCollapsible } from "#/features/chat/components/ChatMessage/CollapsibleDetails";
import { SpeakButton } from "#/features/chat/components/ChatMessage/SpeakButton";
import { partsText } from "#/features/chat/lib/message-text";

type Props = { message: UIMessage; isStreaming?: boolean };
export function ChatMessage({ message, isStreaming }: Props) {
	const content = partsText(message.parts);

	if (message.role === "user") {
		return (
			<article aria-label="Your message" className="flex justify-end px-4 py-2">
				<div className="max-w-[75%] rounded-2xl rounded-br-xs bg-primary px-4 py-2.5 text-sm text-primary-foreground">
					<p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{content}</p>
				</div>
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
				<Streamdown
					plugins={{ code }}
					linkSafety={{ enabled: false }}
					caret="block"
					isAnimating={isStreaming}
					className="w-fit max-w-[85%] rounded-2xl rounded-bl-xs bg-muted px-4 py-2.5 text-sm"
				>
					{content}
				</Streamdown>
			)}

			{toolCalls.length > 0 && (
				<div className="space-y-1.5">
					{toolCalls.map((tc) => (
						<MessageCollapsible key={tc.id} icon={TerminalIcon} label={tc.name}>
							<pre className="whitespace-pre-wrap wrap-break-word px-3 py-2.5 font-mono leading-relaxed text-muted-foreground">
								{tc.output == null
									? ""
									: typeof tc.output === "string"
										? tc.output
										: JSON.stringify(tc.output, null, 2)}
							</pre>
						</MessageCollapsible>
					))}
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
