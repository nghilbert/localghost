import { useChat } from "@tanstack/ai-react";
import { useMemo } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "#/components/ui/empty";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "#/components/ui/message-scroller";
import { ChatInput } from "#/features/chat/components/ChatInput";
import { ChatStatus } from "#/features/chat/components/ChatView/ChatStatus";
import { useConversation } from "#/features/chat/hooks/use-conversation";
import { chatClientOptions } from "#/features/chat/lib/chat-client-options";
import type { getConversation } from "#/features/chat/lib/conversation.functions";
import { ChatMessage } from "../ChatMessage";

type ChatViewProps = { conversation: Awaited<ReturnType<typeof getConversation>> };
export function ChatView({ conversation }: ChatViewProps) {
	const {
		selection,
		setSelection,
		isReady,
		enabledTools,
		setEnabledTools,
		forceWebSearch,
		setForceWebSearch,
		resetTools,
		supportsTools,
		toolsToSend,
	} = useConversation(conversation.id);

	// Ephemeral per-conversation tool selection, sent with each message via
	// `forwardedProps` and never persisted. `useChat` re-reads `forwardedProps` on
	// every send, so a fresh object here means the latest choice rides along.
	const forwardedProps = useMemo(
		() => ({ conversationId: conversation.id, enabledTools: toolsToSend, forceWebSearch }),
		[conversation.id, toolsToSend, forceWebSearch],
	);

	const { messages, sendMessage, stop, status, error, reload } = useChat({
		...chatClientOptions,
		id: conversation.id,
		forwardedProps,
	});
	const isStreaming = status === "submitted" || status === "streaming";

	/** Sends, then resets the toggles to defaults so a manual toggle lasts one message. */
	async function handleSend(content: string) {
		await sendMessage(content);
		resetTools();
	}

	return (
		<MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
			<MessageScroller>
				<MessageScrollerViewport aria-label="Conversation" className="p-4">
					<MessageScrollerContent aria-busy={isStreaming}>
						{messages.length === 0 && (
							<Empty className="my-auto">
								<EmptyHeader>
									<EmptyTitle className="text-2xl">What can I help with?</EmptyTitle>
									<EmptyDescription>
										Start typing. Your chat begins with your first message.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}
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
						<MessageScrollerItem>
							<ChatStatus status={status} error={error} onRetry={reload} />
						</MessageScrollerItem>
					</MessageScrollerContent>
					<MessageScrollerButton />
				</MessageScrollerViewport>
				<ChatInput
					disabled={!isReady}
					isStreaming={isStreaming}
					selection={selection}
					onSelect={setSelection}
					tools={{
						enabledTools,
						forceWebSearch,
						supportsTools,
						onEnabledToolsChange: setEnabledTools,
						onForceWebSearchChange: setForceWebSearch,
					}}
					sendMessage={handleSend}
					stop={stop}
				/>
			</MessageScroller>
		</MessageScrollerProvider>
	);
}
