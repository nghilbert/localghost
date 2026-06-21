import type { UIMessage } from "@tanstack/ai-client";
import { ArrowDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";
import { ChatMessage } from "#/features/chat/components/ChatMessage";
import { ChatEmpty } from "#/features/chat/components/ChatView/ChatEmpty";
import { useStickToBottom } from "#/features/chat/hooks/use-stick-to-bottom";

type Props = {
	messages: UIMessage[];
	isStreaming: boolean;
	isReady: boolean;
	children: ReactNode;
};

export function ChatWindow({ messages, isStreaming, isReady, children }: Props) {
	const { scrollRef, showButton, scrollToBottom, handleScroll } = useStickToBottom();
	return (
		<div className="relative flex min-h-0 flex-1 flex-col">
			<section
				ref={scrollRef}
				onScroll={handleScroll}
				aria-label="Conversation"
				aria-live="polite"
				aria-relevant="additions"
				className="flex flex-1 flex-col overflow-y-auto px-4"
			>
				{messages.length === 0 ? (
					<ChatEmpty isReady={isReady} />
				) : (
					messages.map((msg, idx) => {
						const isLast = idx === messages.length - 1;
						const isStreamingMessage = isStreaming && isLast && msg.role === "assistant";
						return <ChatMessage key={msg.id} message={msg} isStreaming={isStreamingMessage} />;
					})
				)}
				{children}
			</section>
			{showButton && (
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
