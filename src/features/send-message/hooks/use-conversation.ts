import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { conversationQueryOptions } from "#/entities/conversation/conversation.functions";
import { endpointsQueryOptions } from "#/entities/endpoint/endpoint.functions";
import type { ModelSelection } from "#/entities/endpoint/types";
import { useChatTools } from "#/features/send-message/hooks/use-chat-tools";

/**
 * State driving one active chat: the model it's locked to (fixed at creation)
 * plus the ephemeral per-send tool toggles. The locked selection only resolves
 * while its endpoint exists, so a chat on a deleted endpoint can't send.
 */
export function useConversation({ conversationId }: { conversationId: string }) {
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));
	const { data: endpoints, isPending: endpointsPending } = useQuery(endpointsQueryOptions());

	// Optimistic until the endpoint list loads.
	const endpointExists =
		endpointsPending || (endpoints?.some((e) => e.id === conversation.endpointId) ?? false);
	const selection: ModelSelection | null =
		conversation.endpointId && conversation.model && endpointExists
			? { endpointId: conversation.endpointId, model: conversation.model }
			: null;

	const tools = useChatTools({ selection });
	return { selection, isReady: Boolean(selection), ...tools };
}
