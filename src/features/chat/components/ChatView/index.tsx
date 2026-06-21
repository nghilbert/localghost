import { useChat } from "@tanstack/ai-react";
import { useMemo, useState } from "react";
import { ChatInput } from "#/features/chat/components/ChatView/ChatInput";
import { ChatStatus } from "#/features/chat/components/ChatView/ChatStatus";
import { ChatWindow } from "#/features/chat/components/ChatView/ChatWindow";
import { useChatAutoRename } from "#/features/chat/hooks/use-chat-auto-rename";
import { useConversationSettings } from "#/features/chat/hooks/use-conversation-settings";
import { useModelWarmup } from "#/features/chat/hooks/use-model-warmup";
import { chatClientOptions } from "#/features/chat/lib/chat-client-options";
import type { getConversation } from "#/features/chat/lib/conversation.functions";
import { cn } from "#/lib/utils";
import { ExportMenu } from "./ExportMenu";

type Conversation = Awaited<ReturnType<typeof getConversation>>;

type ChatViewProps = { conversation: Conversation; className?: string };
export function ChatView({ conversation, className }: ChatViewProps) {
	const { isReady, model, endpointId, provider } = useConversationSettings(conversation.id);
	const { isWarming, seconds: warmSeconds } = useModelWarmup({ endpointId, model, provider });

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
		<div className={cn("flex h-full w-full flex-col min-h-0", className)}>
			<ExportMenu conversation={conversation} messages={messages} className="mt-2 mr-2 self-end" />

			<ChatWindow messages={messages} isStreaming={isStreaming} isReady={isReady}>
				<ChatStatus
					status={status}
					error={error}
					isWarming={isWarming}
					warmSeconds={warmSeconds}
					onRetry={reload}
				/>
			</ChatWindow>

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
