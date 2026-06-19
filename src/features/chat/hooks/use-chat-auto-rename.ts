import type { UIMessage } from "@tanstack/ai-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { renameConversation } from "#/features/chat/lib/conversation.functions";
import { partsText } from "#/features/chat/lib/message-text";

/**
 * The auto-naming side effect for a chat: once the first exchange finishes, derive
 * a title for a brand-new conversation and refresh the sidebar list.
 *
 * Returns the `onFinish` callback to hand to `useChat`, plus `messagesRef` — assign
 * the live `messages` to `messagesRef.current` each render so `onFinish` can read the
 * latest transcript (it only receives the finishing assistant message).
 */
export function useChatAutoRename(conversationId: string) {
	const queryClient = useQueryClient();
	const messagesRef = useRef<UIMessage[]>([]);

	const onFinish = useCallback(
		async (assistant: UIMessage) => {
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
		[conversationId, queryClient],
	);

	return { onFinish, messagesRef };
}
