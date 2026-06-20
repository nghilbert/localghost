import { useChat } from "@tanstack/ai-react";
import { useMemo, useState } from "react";
import { ChatInput } from "#/features/chat/components/ChatView/ChatInput";
import { ChatWindow } from "#/features/chat/components/ChatView/ChatWindow";
import { useChatAutoRename } from "#/features/chat/hooks/use-chat-auto-rename";
import { useConversationSettings } from "#/features/chat/hooks/use-conversation-settings";
import { chatClientOptions } from "#/features/chat/lib/chat-client-options";
import type { getConversation } from "#/features/chat/lib/conversation.functions";
import { ExportMenu } from "./ExportMenu";

type Conversation = Awaited<ReturnType<typeof getConversation>>;

type ChatViewProps = { conversation: Conversation };
export function ChatView({ conversation }: ChatViewProps) {
	const { isReady } = useConversationSettings(conversation.id);

	// Ephemeral per-conversation tool selection — sent with each message via
	// `forwardedProps`, never persisted. `useChat` re-reads `forwardedProps` on
	// every send, so a fresh object here means the latest choice rides along.
	const [enabledTools, setEnabledTools] = useState<string[]>([]);
	const forwardedProps = useMemo(
		() => ({ conversationId: conversation.id, enabledTools }),
		[conversation.id, enabledTools],
	);

	const { onFinish, messagesRef } = useChatAutoRename(conversation.id);
	const { messages, sendMessage, stop, status, error, reload } = useChat({
		...chatClientOptions,
		id: conversation.id,
		forwardedProps,
		onFinish,
	});
	messagesRef.current = messages;
	const isStreaming = status === "submitted" || status === "streaming";

	return (
		<div className="mx-auto flex h-full w-full max-w-3xl flex-col min-h-0">
			<div className="flex justify-end px-4 pt-2">
				<ExportMenu conversation={conversation} messages={messages} />
			</div>

			<ChatWindow
				messages={messages}
				status={status}
				error={error}
				isReady={isReady}
				onRetry={reload}
			/>

			<div className="px-4 pb-4 pt-2">
				<ChatInput
					conversationId={conversation.id}
					isStreaming={isStreaming}
					enabledTools={enabledTools}
					onEnabledToolsChange={setEnabledTools}
					sendMessage={sendMessage}
					stop={stop}
				/>
			</div>
		</div>
	);
}
