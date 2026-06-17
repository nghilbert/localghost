import { fetchServerSentEvents, type UIMessage } from "@tanstack/ai-client";
import { useChat } from "@tanstack/ai-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { createChatPersistence } from "#/features/chat/lib/chat-persistence";
import { renameConversation } from "#/features/chat/lib/conversation.functions";
import { partsText } from "#/features/chat/lib/message-text";

// The SSE connection and persistence adapters are static, so they are created
// once and shared. `useChat` recreates its client whenever `id` changes, which
// hydrates the new conversation from `persistence.getItem(id)`.
const connection = fetchServerSentEvents("/api/chat/stream");
const persistence = createChatPersistence();

export function useChatStream({ conversationId }: { conversationId: string }) {
	const queryClient = useQueryClient();
	const bottomRef = useRef<HTMLDivElement>(null);
	const messagesRef = useRef<UIMessage[]>([]);

	const scrollToBottom = useCallback(() => {
		requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
	}, []);

	const forwardedProps = useMemo(() => ({ conversationId }), [conversationId]);

	const { messages, sendMessage, stop, status } = useChat({
		connection,
		persistence,
		id: conversationId,
		forwardedProps,
		onFinish: async (assistant) => {
			// Auto-name a brand-new conversation once its first exchange completes.
			const userMessages = messagesRef.current.filter((m) => m.role === "user");
			if (userMessages.length === 1) {
				const userText = userMessages[0] ? partsText(userMessages[0].parts) : "";
				const assistantText = partsText(assistant.parts);
				await renameConversation({
					data: { id: conversationId, userText, assistantText },
				}).catch(() => {});
			}
			queryClient.invalidateQueries({ queryKey: ["conversations"] });
		},
	});

	messagesRef.current = messages;
	const isStreaming = status === "submitted" || status === "streaming";

	// Keep the feed pinned to the latest content as the transcript streams in.
	useEffect(() => scrollToBottom());

	const handleSubmit = useCallback(
		async (message: string) => {
			if (isStreaming) return;
			await sendMessage(message);
		},
		[isStreaming, sendMessage],
	);

	const handleStop = useCallback(() => stop(), [stop]);

	return { messages, isStreaming, bottomRef, handleSubmit, handleStop };
}
