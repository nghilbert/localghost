import { useChat } from "@tanstack/ai-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { createChatOptions, takeChatHandoff } from "#/features/chat/lib/chat-client";
import type { getConversation } from "#/features/chat/lib/conversation.functions";
import { awaitingAssistantResponse } from "#/features/chat/lib/messages";
import { ChatMessage } from "../ChatMessage";

type ChatViewProps = { conversation: Awaited<ReturnType<typeof getConversation>> };
export function ChatView({ conversation }: ChatViewProps) {
	const queryClient = useQueryClient();

	const { selection, isReady, controls, forceWebSearch, resetTools, toolsToSend } = useConversation(
		{ conversationId: conversation.id },
	);

	// Ephemeral per-conversation tool selection, sent with each message via
	// `forwardedProps` and never persisted. `useChat` re-reads `forwardedProps` on
	// every send, so a fresh object here means the latest choice rides along.
	const forwardedProps = useMemo(
		() => ({ conversationId: conversation.id, enabledTools: toolsToSend, forceWebSearch }),
		[conversation.id, toolsToSend, forceWebSearch],
	);

	const chatOptions = useMemo(() => createChatOptions(queryClient), [queryClient]);
	const { messages, sendMessage, stop, status, error, reload } = useChat({
		...chatOptions,
		id: conversation.id,
		forwardedProps,
	});
	const isStreaming = status === "submitted" || status === "streaming";

	/** Sends, then resets the toggles to defaults so a manual toggle lasts one message. */
	async function handleSend(content: string) {
		await sendMessage(content);
		resetTools();
	}

	// Apply the draft page's tool-toggle handoff exactly once, client-side only.
	// State-based so the response request below waits a render for the toggles to
	// land in `forwardedProps` before it fires.
	const [handoffApplied, setHandoffApplied] = useState(false);
	useEffect(() => {
		if (handoffApplied) return;
		const handoff = takeChatHandoff(conversation.id);
		if (handoff) {
			controls.onEnabledToolsChange(handoff.enabledTools);
			controls.onForceWebSearchChange(handoff.forceWebSearch);
		}
		setHandoffApplied(true);
	});

	// The draft page persists the first user message at creation; once the transcript
	// hydrates ending on it (also after a refresh mid-handoff), request the response.
	const responseRequested = useRef(false);
	useEffect(() => {
		if (!handoffApplied || responseRequested.current) return;
		if (status !== "ready" || !awaitingAssistantResponse(messages)) return;
		responseRequested.current = true;
		void reload().then(resetTools);
	});

	return (
		<div className="flex h-full min-h-0 flex-col">
			<MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
				<MessageScroller className="flex-1">
					<MessageScrollerViewport aria-label="Conversation" className="p-4">
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
							<MessageScrollerItem>
								<ChatStatus
									conversationId={conversation.id}
									status={status}
									messages={messages}
									error={error}
									onRetry={reload}
								/>
							</MessageScrollerItem>
						</MessageScrollerContent>
					</MessageScrollerViewport>
					<MessageScrollerButton />
				</MessageScroller>
			</MessageScrollerProvider>
			<div className="px-4 pb-4">
				<ChatInput
					disabled={!isReady}
					isStreaming={isStreaming}
					selection={selection}
					locked
					tools={controls}
					sendMessage={handleSend}
					stop={stop}
				/>
			</div>
		</div>
	);
}
