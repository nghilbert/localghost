import type { UIMessage } from "@tanstack/ai-client";
import { ArrowDownIcon } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { Button } from "#/components/ui/button";
import { ChatMessage } from "#/features/chat/components/ChatMessage";

type ChatWindowProps = PropsWithChildren<{
	messages: UIMessage[];
	isStreaming: boolean;
}>;

export function ChatWindow({ messages, isStreaming, children }: ChatWindowProps) {
	const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom();

	return (
		<div className="relative flex min-h-0 flex-1 flex-col">
			<section
				ref={scrollRef}
				aria-label="Conversation"
				aria-live="polite"
				aria-relevant="additions"
				className="flex flex-1 flex-col overflow-y-auto px-4"
			>
				<div ref={contentRef} className="flex flex-1 flex-col">
					{messages.map((msg, idx) => {
						const isLast = idx === messages.length - 1;
						const isStreamingMessage = isStreaming && isLast && msg.role === "assistant";
						return <ChatMessage key={msg.id} message={msg} isStreaming={isStreamingMessage} />;
					})}
					{children}
				</div>
			</section>
			{!isAtBottom && messages.length > 0 && (
				<Button
					type="button"
					size="icon"
					variant="outline"
					onClick={() => scrollToBottom()}
					className="absolute right-4 bottom-2 size-8 rounded-full shadow-md"
				>
					<ArrowDownIcon size={16} />
					<span className="sr-only">Scroll to latest</span>
				</Button>
			)}
		</div>
	);
}
