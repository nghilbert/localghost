import { useChat } from "@tanstack/ai-react";
import { useMemo, useState } from "react";
import { ChatInput } from "#/features/chat/components/ChatView/ChatInput";
import { ChatStatus } from "#/features/chat/components/ChatView/ChatStatus";
import { ChatWindow } from "#/features/chat/components/ChatView/ChatWindow";
import { useConversationSettings } from "#/features/chat/hooks/use-conversation-settings";
import { useModelWarmup } from "#/features/chat/hooks/use-model-warmup";
import { chatClientOptions } from "#/features/chat/lib/chat-client-options";
import type { getConversation } from "#/features/chat/lib/conversation.functions";

type ChatViewProps = { conversation: Awaited<ReturnType<typeof getConversation>> };
export function ChatView({ conversation }: ChatViewProps) {
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

	const { messages, sendMessage, stop, status, error, reload } = useChat({
		...chatClientOptions,
		id: conversation.id,
		forwardedProps,
	});
	const isStreaming = status === "submitted" || status === "streaming";

	return (
		<div className="flex h-full w-full flex-col min-h-0 gap-1 pb-6">
			<ChatWindow messages={messages} isStreaming={isStreaming} isReady={isReady}>
				<ChatStatus
					status={status}
					error={error}
					isWarming={isWarming}
					warmSeconds={warmSeconds}
					onRetry={reload}
				/>
			</ChatWindow>

			<ChatInput
				conversationId={conversation.id}
				isStreaming={isStreaming}
				enabledTools={enabledTools}
				onEnabledToolsChange={setEnabledTools}
				sendMessage={sendMessage}
				stop={stop}
			/>
		</div>
	);
}
