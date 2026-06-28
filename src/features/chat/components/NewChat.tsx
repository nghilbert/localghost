import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { ChatInput } from "#/features/chat/components/ChatInput";
import { useCreateConversation } from "#/features/chat/hooks/use-create-conversation";

/** The landing composer. Creates the conversation row on first send. */
export function NewChat() {
	const createConversation = useCreateConversation();

	return (
		<Empty className="mx-auto h-full max-w-2xl px-4">
			<EmptyHeader>
				<EmptyTitle className="text-2xl">What can I help with?</EmptyTitle>
				<EmptyDescription>Start typing. Your chat begins with your first message.</EmptyDescription>
			</EmptyHeader>

			<EmptyContent className="w-full max-w-none">
				<ChatInput
					disabled={!createConversation.isReady}
					isStreaming={createConversation.isPending}
					selection={createConversation.selection}
					onSelect={createConversation.setSelection}
					sendMessage={createConversation.mutate}
				/>
			</EmptyContent>
		</Empty>
	);
}
