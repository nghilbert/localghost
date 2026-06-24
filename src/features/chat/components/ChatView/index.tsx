import { useChat } from "@tanstack/ai-react";
import { useMemo } from "react";
import { ChatInput } from "#/features/chat/components/ChatView/ChatInput";
import { ChatStatus } from "#/features/chat/components/ChatView/ChatStatus";
import { ChatWindow } from "#/features/chat/components/ChatView/ChatWindow";
import { useChatTools } from "#/features/chat/hooks/use-chat-tools";
import { useConversationSettings } from "#/features/chat/hooks/use-conversation-settings";
import { chatClientOptions } from "#/features/chat/lib/chat-client-options";
import type { getConversation } from "#/features/chat/lib/conversation.functions";

type ChatViewProps = { conversation: Awaited<ReturnType<typeof getConversation>> };
export function ChatView({ conversation }: ChatViewProps) {
	const { isReady, model, endpointId, setModel } = useConversationSettings(conversation.id);
	const { enabledTools, setEnabledTools, resetTools, supportsTools, toolsToSend } = useChatTools(
		endpointId,
		model,
	);

	// Ephemeral per-conversation tool selection — sent with each message via
	// `forwardedProps`, never persisted. `useChat` re-reads `forwardedProps` on
	// every send, so a fresh object here means the latest choice rides along.
	const forwardedProps = useMemo(
		() => ({ conversationId: conversation.id, enabledTools: toolsToSend }),
		[conversation.id, toolsToSend],
	);

	const { messages, sendMessage, stop, status, error, reload } = useChat({
		...chatClientOptions,
		id: conversation.id,
		forwardedProps,
	});
	const isStreaming = status === "submitted" || status === "streaming";

	/** Sends, then resets the picker to defaults so a manual toggle lasts one message. */
	async function handleSend(content: string) {
		await sendMessage(content);
		resetTools();
	}

	return (
		<div className="flex h-full w-full flex-col min-h-0 gap-1 pb-6">
			<ChatWindow messages={messages} isStreaming={isStreaming} isReady={isReady}>
				<ChatStatus status={status} error={error} onRetry={reload} />
			</ChatWindow>

			<ChatInput
				model={model}
				endpointId={endpointId}
				isReady={isReady}
				onModelSelect={setModel}
				isStreaming={isStreaming}
				enabledTools={enabledTools}
				supportsTools={supportsTools}
				onEnabledToolsChange={setEnabledTools}
				sendMessage={handleSend}
				stop={stop}
			/>
		</div>
	);
}
