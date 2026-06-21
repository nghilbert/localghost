import type { ChatClientState, UIMessage } from "@tanstack/ai-client";
import { Link } from "@tanstack/react-router";
import { ArrowDownIcon, BookOpenIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { ChatMessage } from "#/features/chat/components/ChatMessage";
import { ChatStatus } from "#/features/chat/components/ChatView/ChatStatus";
import { useStickToBottom } from "#/features/chat/hooks/use-stick-to-bottom";

type Props = {
	messages: UIMessage[];
	status: ChatClientState;
	error: Error | undefined;
	isReady: boolean;
	onRetry: () => void;
};

export function ChatWindow({ messages, status, error, isReady, onRetry }: Props) {
	const isStreaming = status === "submitted" || status === "streaming";
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
				{messages.length === 0 &&
					(isReady ? (
						<Empty className="h-full">
							<EmptyHeader>
								<EmptyDescription>Send a message to start chatting.</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<Empty className="h-full">
							<EmptyHeader>
								<EmptyTitle>No model connected yet</EmptyTitle>
								<EmptyDescription>
									Install a local model in the Library, then pick it from the model menu below the
									message box.
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button asChild>
									<Link to="/library">
										<BookOpenIcon />
										Browse the Library
									</Link>
								</Button>
							</EmptyContent>
						</Empty>
					))}
				{messages.map((msg, idx) => {
					const isLast = idx === messages.length - 1;
					const isStreamingMessage = isStreaming && isLast && msg.role === "assistant";
					return <ChatMessage key={msg.id} message={msg} isStreaming={isStreamingMessage} />;
				})}
				<ChatStatus status={status} error={error} onRetry={onRetry} />
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
