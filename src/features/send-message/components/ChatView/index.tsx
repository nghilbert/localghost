import { useChat } from "@tanstack/ai-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
	type ConversationDetail,
	generateConversationTitle,
	modelRunStateQueryOptions,
} from "#/entities/conversation/conversation.functions";
import {
	awaitingAssistantResponse,
	deriveConversationTitle,
	editUserMessage,
	historyStartIndex,
	markInterrupted,
	partsText,
} from "#/entities/conversation/messages";
import { ChatInput } from "#/features/send-message/components/ChatInput";
import { ChatStatus } from "#/features/send-message/components/ChatView/ChatStatus";
import { useConversation } from "#/features/send-message/hooks/use-conversation";
import { createChatOptions } from "#/features/send-message/lib/chat-client";
import { takeChatHandoff } from "#/features/send-message/lib/chat-handoff";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "#/shared/ui/message-scroller";
import { Separator } from "#/shared/ui/separator";
import { ChatMessage } from "../ChatMessage";

/** Marks the history-trim cut: messages above it are no longer sent to the model. */
function HistoryTrimDivider() {
	return (
		<div
			data-testid="history-trim-divider"
			className="flex items-center gap-3 py-2 text-xs text-muted-foreground"
		>
			<Separator className="flex-1" />
			Earlier messages aren't sent to the model
			<Separator className="flex-1" />
		</div>
	);
}

type ChatViewProps = { conversation: ConversationDetail };
export function ChatView({ conversation }: ChatViewProps) {
	const queryClient = useQueryClient();

	const { selection, isReady, controls, resetTools, toolsToSend } = useConversation({
		conversationId: conversation.id,
	});

	// Ephemeral per-conversation tool selection, sent with each message via
	// `forwardedProps` and never persisted. `useChat` re-reads `forwardedProps` on
	// every send, so a fresh object here means the latest choice rides along.
	// The timezone rides along so the server can state the user's local time.
	const forwardedProps = useMemo(
		() => ({
			conversationId: conversation.id,
			enabledTools: toolsToSend,
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		}),
		[conversation.id, toolsToSend],
	);

	const chatOptions = useMemo(() => createChatOptions(queryClient), [queryClient]);
	const { messages, sendMessage, stop, status, error, reload, setMessages } = useChat({
		...chatOptions,
		id: conversation.id,
		forwardedProps,
	});
	const isStreaming = status === "submitted" || status === "streaming";

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
	async function handleSend(content: string) {
		await sendMessage(content);
		resetTools();
	}

	/** Stops the stream and flags the cut-off reply; the flag persists with the message. */
	function handleStop() {
		stop();
		setMessages(markInterrupted(messages));
	}

	/** Rewrites a sent user message, drops every later turn, and re-requests a reply. */
	function handleEditResend(id: string, content: string) {
		setMessages(editUserMessage({ messages, id, content }));
		void reload();
	}

	const titleMutation = useMutation({
		mutationFn: () => generateConversationTitle({ data: { id: conversation.id } }),
		onSuccess: (title) => {
			if (!title) return;
			void queryClient.invalidateQueries({ queryKey: ["conversations"] });
			void queryClient.invalidateQueries({ queryKey: ["conversation", conversation.id] });
		},
	});

	// Auto-title fires only after a reply generated in this mount, never on merely
	// reopening an old conversation that kept its derived default title.
	const streamedThisMount = useRef(false);
	if (isStreaming) streamedThisMount.current = true;

	// Once the first reply completes, ask the model to title the conversation. The
	// server skips manual renames authoritatively; the check here just avoids a
	// pointless request when the title visibly isn't the derived default anymore.
	const titleRequested = useRef(false);
	useEffect(() => {
		if (titleRequested.current || !streamedThisMount.current || status !== "ready") return;
		if (!messages.some((msg) => msg.role === "assistant")) return;
		const firstUserText = partsText(messages.find((msg) => msg.role === "user")?.parts ?? []);
		if (conversation.title !== deriveConversationTitle(firstUserText)) return;
		titleRequested.current = true;
		titleMutation.mutate();
	});

	// Apply the draft page's tool-toggle handoff exactly once, client-side only.
	// The presence of a handoff also marks this mount as the new-chat handoff: only
	// then do we auto-request the first response. `null` means not yet checked, so
	// the response request below waits a render for the toggles to land in
	// `forwardedProps` and for intent to be known.
	const [autoRespond, setAutoRespond] = useState<boolean | null>(null);
	useEffect(() => {
		if (autoRespond !== null) return;
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

	// Where the server's history trim will cut the next request; a divider above
	// that message tells the user the model no longer sees what came before.
	const historyStart = historyStartIndex(messages);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
				<MessageScroller className="flex-1">
					<MessageScrollerViewport aria-label="Conversation" className="p-4">
						<MessageScrollerContent aria-busy={isStreaming}>
							{messages.map((msg, idx) => {
								const isLast = idx === messages.length - 1;
								const isLastAssistant = isLast && msg.role === "assistant";
								return (
									<Fragment key={msg.id}>
										{historyStart > 0 && idx === historyStart && <HistoryTrimDivider />}
										<MessageScrollerItem messageId={msg.id} scrollAnchor={msg.role === "user"}>
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
											/>
										</MessageScrollerItem>
									</Fragment>
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
					stop={handleStop}
				/>
			</div>
		</div>
	);
}
