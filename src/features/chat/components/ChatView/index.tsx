import { useChat } from "@tanstack/ai-react";
import { PageHeader } from "#/components/PageHeader";
import { ChatInput } from "#/features/chat/components/ChatView/ChatInput";
import { ChatMessages } from "#/features/chat/components/ChatView/ChatMessages";
import { useChatAutoRename } from "#/features/chat/hooks/use-chat-auto-rename";
import { useConversationSettings } from "#/features/chat/hooks/use-conversation-settings";
import { chatClientOptions } from "#/features/chat/lib/chat-client-options";
import type { getConversation } from "#/features/chat/lib/conversation.functions";
import { ExportMenu } from "./ExportMenu";

type Conversation = Awaited<ReturnType<typeof getConversation>>;

type ChatViewProps = { conversation: Conversation };
export function ChatView({ conversation }: ChatViewProps) {
	const { isReady } = useConversationSettings(conversation.id);

	const { onFinish, messagesRef } = useChatAutoRename(conversation.id);
	const { messages, sendMessage, stop, status } = useChat({
		...chatClientOptions,
		id: conversation.id,
		forwardedProps: { conversationId: conversation.id },
		onFinish,
	});
	messagesRef.current = messages;
	const isStreaming = status === "submitted" || status === "streaming";

	return (
		<div className="flex h-full flex-col">
			<PageHeader
				title={conversation.title}
				actions={
					<ExportMenu
						conversation={{
							id: conversation.id,
							title: conversation.title,
							model: conversation.model,
						}}
						messages={messages}
					/>
				}
			/>

			<ChatMessages messages={messages} isStreaming={isStreaming} isReady={isReady} />

			<div className="px-4 py-3">
				<ChatInput
					conversationId={conversation.id}
					isStreaming={isStreaming}
					sendMessage={sendMessage}
					stop={stop}
				/>
			</div>
		</div>
	);
}
