import { useChat } from "@tanstack/ai-react";
import { PageHeader } from "#/components/PageHeader";
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
				actions={<ExportMenu conversation={conversation} messages={messages} />}
			/>

			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-0">
				<ChatWindow messages={messages} isStreaming={isStreaming} isReady={isReady} />

				<div className="px-4 pb-4 pt-2">
					<ChatInput
						conversationId={conversation.id}
						isStreaming={isStreaming}
						sendMessage={sendMessage}
						stop={stop}
					/>
				</div>
			</div>
		</div>
	);
}
