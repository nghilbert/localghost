import { useChat } from "@tanstack/ai-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useConversation } from "#/routes/_authenticated/_chat/-hooks/use-conversation";
import {
	type Attachment,
	composeMessageContent,
} from "#/routes/_authenticated/_chat/-lib/attachments";
import { createChatConnection } from "#/routes/_authenticated/_chat/-lib/chat-client";
import { takeChatHandoff } from "#/routes/_authenticated/_chat/-lib/chat-handoff";
import { CHAT_TOOLS } from "#/routes/_authenticated/_chat/-lib/chat-tools";
import { ChatInput } from "#/routes/_authenticated/-components/ChatInput";
import { ChatMessage } from "#/routes/_authenticated/-components/ChatMessage";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "#/shared/components/ui/message-scroller";
import {
	type ConversationDetail,
	modelRunStateQueryOptions,
} from "#/shared/domain/conversation/conversation.functions";
import { awaitingAssistantResponse, editUserMessage } from "#/shared/domain/conversation/messages";
import { ChatStatus } from "./ChatStatus";
import { QueuedMessageItem } from "./QueuedMessageItem";

type ChatThreadProps = { conversation: ConversationDetail };
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

	// Ephemeral per-conversation tool selection, sent with each message via
	// `forwardedProps` and never persisted. `useChat` re-reads `forwardedProps` on
	// every send, so a fresh object here means the latest choice rides along.
	// The timezone rides along so the server can state the user's local time.
	const forwardedProps = {
		conversationId: conversation.id,
		enabledTools: toolsToSend,
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	};

	const [connection] = useState(() => createChatConnection());
	const {
		messages,
		queue,
		cancelQueued,
		sendMessage,
		stop,
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

	// While a response is in flight, poll whether the local model is still loading
	// so the trail's pending head can read "Warming up" on a cold start. Once it
	// reports ready it stays loaded; stop polling until the next cold start.
	const { data: runState } = useQuery({
		...modelRunStateQueryOptions(conversation.id),
		enabled: isStreaming,
		refetchInterval: (query) => (query.state.data === "ready" ? false : 2_000),
	});
	const pendingLabel =
		runState === "warming"
			? "Warming up the model"
			: runState === "unreachable"
				? "Waiting for the model server, which isn't responding"
				: undefined;

	/** Sends, then resets the toggles to defaults so a manual toggle lasts one message. */
	async function handleSend(content: string, attachments: Attachment[]) {
		await sendMessage(composeMessageContent({ text: content, attachments }));
		resetTools();
	}

	/** Rewrites a sent user message, drops every later turn, and re-requests a reply. */
	function handleEditResend(id: string, content: string) {
		setMessages(editUserMessage({ messages, id, content }));
		void reload();
	}

	// Apply the draft page's tool-toggle handoff exactly once, client-side only.
	// The presence of a handoff also marks this mount as the new-chat handoff: only
	// then do we auto-request the first response. `null` means not yet checked, so
	// the response request below waits a render for the toggles to land in
	// `forwardedProps` and for intent to be known.
	const [autoRespond, setAutoRespond] = useState<boolean | null>(null);
	// A ref, not the `autoRespond` state, gates this: `takeChatHandoff` deletes the
	// handoff as it reads it, so under StrictMode's double-invoked effect the state
	// guard (still null in the shared closure) lets the second run consume nothing
	// and clobber `autoRespond` back to false. The ref is set synchronously first.
	const handoffChecked = useRef(false);
	useEffect(() => {
		if (handoffChecked.current) return;
		handoffChecked.current = true;
		const handoff = takeChatHandoff(conversation.id);
		if (handoff) {
			controls.onEnabledToolsChange(handoff.enabledTools);
		}
		setAutoRespond(handoff !== null);
	});

	// The draft page persists the first user message at creation; once the transcript
	// hydrates ending on it, request the response. Gated on the handoff so reopening a
	// stored conversation that happens to end on a user turn does not silently generate.
	const responseRequested = useRef(false);
	useEffect(() => {
		if (autoRespond !== true || responseRequested.current) return;
		if (status !== "ready" || !awaitingAssistantResponse(messages)) return;
		responseRequested.current = true;
		void reload().then(resetTools);
	});

	// A stored transcript ending on a user turn (a prior run errored, was stopped, or
	// the tab closed before the reply persisted) gets an explicit affordance instead.
	const canGenerate =
		autoRespond === false && status === "ready" && awaitingAssistantResponse(messages);

	return (
		<div className="flex min-h-0 flex-col">
			<MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
				<MessageScroller className="flex-1">
					<MessageScrollerViewport aria-label="Conversation" className="p-4">
						<MessageScrollerContent aria-busy={isStreaming}>
							{messages.map((msg, idx) => {
								const isLast = idx === messages.length - 1;
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
													? (content) => handleEditResend(msg.id, content)
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
									error={error}
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
					stop={stop}
				/>
			</div>
		</div>
	);
}
