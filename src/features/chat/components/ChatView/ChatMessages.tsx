import type { UIMessage } from "@tanstack/ai-client";
import { Link } from "@tanstack/react-router";
import { BookOpenIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { ChatMessage } from "#/features/chat/components/ChatMessage";

type Props = {
	messages: UIMessage[];
	isStreaming: boolean;
	isReady: boolean;
};

export function ChatMessages({ messages, isStreaming, isReady }: Props) {
	const bottomRef = useRef<HTMLDivElement>(null);

	// Runs every render so the feed stays pinned to the latest content as the
	// transcript streams in (streaming deltas mutate the last message in place).
	useEffect(() => {
		requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
	});

	return (
		<section
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
								Install a local model in the Cookbook, then pick it from the model menu below the
								message box.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button asChild>
								<Link to="/cookbook">
									<BookOpenIcon />
									Browse the Cookbook
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
			<div ref={bottomRef} />
		</section>
	);
}
