import { useChatTools } from "#/features/chat/hooks/use-chat-tools";
import { useConversationModel } from "#/features/chat/hooks/use-conversation-model";

/**
 * All state needed to drive one active chat: the model it's locked to (read-only)
 * plus the ephemeral per-send tool toggles. Tool seeds carry the draft page's handoff
 * so the first message keeps the choices made before the conversation existed.
 */
export function useConversation({
	conversationId,
	initialEnabledTools,
	initialForceWebSearch,
}: {
	conversationId: string;
	initialEnabledTools?: string[];
	initialForceWebSearch?: boolean;
}) {
	const { selection, isReady } = useConversationModel(conversationId);
	const tools = useChatTools({ selection, initialEnabledTools, initialForceWebSearch });
	return { selection, isReady, ...tools };
}
