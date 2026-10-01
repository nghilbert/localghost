import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { chatQueries } from "#/features/chat/chat.queries";
import type { ConversationDetail } from "#/features/chat/chat.types";
import { ChatInput } from "#/features/chat/components/ChatInput";
import { ChatMessage } from "#/features/chat/components/ChatMessage";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "#/features/chat/components/MessageScroller";
import { useCancelChatRun } from "#/features/chat/hooks/use-cancel-chat-run";
import { useConversation } from "#/features/chat/hooks/use-conversation";
import { type Attachment, composeMessageContent } from "#/features/chat/lib/attachments";
import { CHAT_TOOLS } from "#/features/chat/lib/chat-tools";
import {
	awaitingAssistantResponse,
	editUserMessage,
	mergeAssistantTurns,
} from "#/features/chat/lib/messages";
import { takeNewChat } from "#/features/chat/lib/new-chat";
import { MS_PER_SECOND } from "#/lib/format";
import { ChatStatus } from "./ChatStatus";
import { QueuedMessageItem } from "./QueuedMessageItem";

type ChatThreadProps = { conversation: ConversationDetail };
/** A conversation's transcript and message box, streaming replies as they arrive. */
export function ChatThread({ conversation }: ChatThreadProps) {
	const {
		selection,
		isReady,
		controls,
		resetTools,
		toolsToSend,
		supportsImages,
		supportsDocuments,
	} = useConversation({
		conversationId: conversation.id,
	});

	// The tools turned on for this message and the user's timezone. `useChat` reads
	// `forwardedProps` on every send, so this always carries the latest choice.
	const forwardedProps = {
		enabledTools: toolsToSend,
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	};

	const [connection] = useState(() => fetchServerSentEvents("/api/chat/stream"));
	const {
		messages,
		queue,
		cancelQueued,
		sendMessage,
		stop,
		runId,
		status,
		isLoading,
		error,
		reload,
		setMessages,
		interrupts,
	} = useChat({
		connection,
		persistence: true,
		tools: CHAT_TOOLS,
		threadId: conversation.id,
		forwardedProps,
	});
	const isStreaming = isLoading || status === "submitted" || status === "streaming";

	// While a reply is running, poll whether the local model is still loading, to show
	// "Warming up" instead of "Thinking".
	const { data: runState } = useQuery({
		...chatQueries.runState(conversation.id),
		enabled: isStreaming,
		refetchInterval: (query) => (query.state.data === "ready" ? false : 2 * MS_PER_SECOND),
	});
	const pendingLabel =
		runState === "warming"
			? "Warming up the model"
			: runState === "unreachable"
				? "Waiting for the model server, which isn't responding"
				: undefined;

	/** Sends, then resets the tool switches, so a change lasts one message. */
	async function handleSend({
		content,
		attachments,
	}: {
		content: string;
		attachments: Attachment[];
	}) {
		await sendMessage(composeMessageContent({ text: content, attachments }));
		resetTools();
	}

	const cancelRun = useCancelChatRun();

	/**
	 * Marks the run cancelled, then disconnects. The server stops a run only when it was
	 * marked, so a reload keeps it going. Disconnects even if marking fails.
	 */
	function handleStop() {
		if (runId) cancelRun.mutate(runId, { onSettled: stop });
		else stop();
	}

	/** Rewrites a sent user message, drops every later turn, and re-requests a reply. */
	function handleEditResend({ id, content }: { id: string; content: string }) {
		setMessages(editUserMessage({ messages, id, content }));
		void reload();
	}

	// Only a chat just sent from /new answers its first message automatically. `null`
	// until checked, so the reply waits for the carried-over toggles to apply.
	const [autoRespond, setAutoRespond] = useState<boolean | null>(null);
	// `takeNewChat` removes what it reads, so a ref keeps StrictMode's second effect run
	// from reading nothing and resetting `autoRespond`.
	const newChatChecked = useRef(false);
	useEffect(() => {
		if (newChatChecked.current) return;
		newChatChecked.current = true;
		const newChat = takeNewChat(conversation.id);
		if (newChat) {
			controls.onEnabledToolsChange(newChat.enabledTools);
		}
		setAutoRespond(newChat !== null);
	});

	// A reopened chat that ends on a user message does not answer on its own.
	const responseRequested = useRef(false);
	useEffect(() => {
		if (autoRespond !== true || responseRequested.current) return;
		if (status !== "ready" || !awaitingAssistantResponse(messages)) return;
		responseRequested.current = true;
		void reload().then(resetTools);
	});

	// Instead it offers a button to generate the reply.
	const canGenerate =
		autoRespond === false && status === "ready" && awaitingAssistantResponse(messages);

	const turns = mergeAssistantTurns(messages);

	return (
		<div className="flex min-h-0 flex-col">
			<MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
				<MessageScroller className="flex-1">
					<MessageScrollerViewport aria-label="Conversation" className="p-4">
						<MessageScrollerContent aria-busy={isStreaming}>
							{turns.map((msg, idx) => {
								const isLast = idx === turns.length - 1;
								const isLastAssistant = isLast && msg.role === "assistant";
								return (
									<MessageScrollerItem
										key={msg.id}
										messageId={msg.id}
										scrollAnchor={msg.role === "user"}
									>
										<ChatMessage
											message={msg}
											isStreaming={isStreaming && isLastAssistant}
											pendingLabel={isLastAssistant ? pendingLabel : undefined}
											onRegenerate={
												isLastAssistant && !isStreaming ? () => void reload() : undefined
											}
											onEditResend={
												msg.role === "user" && !isStreaming
													? (content) => handleEditResend({ id: msg.id, content })
													: undefined
											}
											interrupts={interrupts}
										/>
									</MessageScrollerItem>
								);
							})}
							<MessageScrollerItem>
								<ChatStatus
									status={status}
									messages={messages}
									pendingLabel={pendingLabel}
									error={error?.message ?? conversation.lastRunError ?? undefined}
									onRetry={reload}
									onGenerate={canGenerate ? () => void reload() : undefined}
								/>
							</MessageScrollerItem>
							{queue.map((item) => (
								<MessageScrollerItem key={item.id}>
									<QueuedMessageItem item={item} onCancel={cancelQueued} />
								</MessageScrollerItem>
							))}
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
					supportsImages={supportsImages}
					supportsDocuments={supportsDocuments}
					sendMessage={handleSend}
					stop={handleStop}
				/>
			</div>
		</div>
	);
}
