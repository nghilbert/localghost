import type { UIMessage } from "@tanstack/ai-client";
import { Markdown } from "#/components/Markdown";
import { ReasoningBlock } from "#/features/chat/components/ChatMessage/ReasoningBlock";
import { SpeakButton } from "#/features/chat/components/ChatMessage/SpeakButton";
import { ToolCallBlock } from "#/features/chat/components/ChatMessage/ToolCallBlock";
import { partsText } from "#/features/chat/lib/message-text";
import { cn } from "#/lib/utils";

type Props = {
	message: UIMessage;
	isStreaming?: boolean;
	autoSpeak?: boolean;
};

type ToolCallView = { id: string; name: string; result: string };

/** Concatenates the message's thinking parts into a single reasoning string. */
function reasoningText(message: UIMessage): string {
	return message.parts
		.flatMap((part) => (part.type === "thinking" ? [part.content] : []))
		.join("\n");
}

/** Renders a tool call's output as display text, regardless of its JSON shape. */
function outputToText(output: unknown): string {
	if (output == null) return "";
	return typeof output === "string" ? output : JSON.stringify(output, null, 2);
}

/**
 * Collects the message's tool-call parts. The framework's `StreamProcessor`
 * attaches each tool's result to its tool-call part as `output`, so no manual
 * pairing with separate tool-result parts is needed.
 */
function toolCallViews(message: UIMessage): ToolCallView[] {
	return message.parts.flatMap((part) =>
		part.type === "tool-call"
			? [{ id: part.id, name: part.name, result: outputToText(part.output) }]
			: [],
	);
}

export function ChatMessage({ message, isStreaming, autoSpeak }: Props) {
	const content = partsText(message.parts);

	if (message.role === "user") {
		return (
			<article aria-label="Your message" className="flex justify-end px-4 py-2">
				<div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
					<p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{content}</p>
				</div>
			</article>
		);
	}

	const reasoning = reasoningText(message);
	const toolCalls = toolCallViews(message);

	return (
		<article aria-label="Assistant message" className="group flex flex-col gap-1.5 px-4 py-3">
			{reasoning && <ReasoningBlock content={reasoning} />}

			<Markdown
				content={content}
				className={cn(
					isStreaming &&
						"after:ml-0.5 after:animate-pulse after:content-['▋'] after:text-muted-foreground",
				)}
			/>

			{toolCalls.length > 0 && (
				<div className="space-y-1.5">
					{toolCalls.map((tc) => (
						<ToolCallBlock key={tc.id} tool={tc.name} result={tc.result} />
					))}
				</div>
			)}

			{!isStreaming && content && (
				<div className="flex items-center gap-1">
					<SpeakButton text={content} autoPlay={autoSpeak} />
				</div>
			)}
		</article>
	);
}
