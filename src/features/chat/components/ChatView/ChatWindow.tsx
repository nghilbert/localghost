import type { UIMessage } from "@tanstack/ai-client";
import type { PropsWithChildren } from "react";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "#/components/ui/message-scroller";
import { ChatMessage } from "#/features/chat/components/ChatMessage";

type ChatWindowProps = PropsWithChildren<{
	messages: UIMessage[];
	isStreaming: boolean;
}>;

export function ChatWindow({ messages, isStreaming, children }: ChatWindowProps) {
	return (
		<MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
			<MessageScroller>
				<MessageScrollerViewport aria-label="Conversation">
					<MessageScrollerContent aria-busy={isStreaming}>
						{messages.map((msg, idx) => {
							const isLast = idx === messages.length - 1;
							return (
								<MessageScrollerItem
									key={msg.id}
									messageId={msg.id}
									scrollAnchor={msg.role === "user"}
								>
									<ChatMessage
										message={msg}
										isStreaming={isStreaming && isLast && msg.role === "assistant"}
									/>
								</MessageScrollerItem>
							);
						})}
						{children && <MessageScrollerItem>{children}</MessageScrollerItem>}
					</MessageScrollerContent>
				</MessageScrollerViewport>
				<MessageScrollerButton />
			</MessageScroller>
		</MessageScrollerProvider>
	);
}
