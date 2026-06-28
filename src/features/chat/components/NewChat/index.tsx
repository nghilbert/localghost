import { ChatInput } from "#/features/chat/components/ChatInput";
import { useCreateConversation } from "#/features/chat/hooks/use-create-conversation";

/**
 * The landing composer. A new chat inherits your most recent model, so the row is
 * created on send by useCreateConversation, which then hands the first message to the
 * conversation view to stream. You switch models inside the chat.
 */
export function NewChat() {
	const createConversation = useCreateConversation();

	return (
		<div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-4 px-4">
			<div className="space-y-1 text-center">
				<h1 className="font-semibold text-2xl">What can I help with?</h1>
				<p className="text-muted-foreground text-sm">
					Start typing. Your chat begins with your first message.
				</p>
			</div>

			<div className="w-full">
				<ChatInput
					disabled={!createConversation.isReady}
					isStreaming={createConversation.isPending}
					sendMessage={createConversation.mutate}
				/>
			</div>
		</div>
	);
}
