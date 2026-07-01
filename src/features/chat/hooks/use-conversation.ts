import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useChatTools } from "#/features/chat/hooks/use-chat-tools";
import { conversationQueryOptions } from "#/features/chat/lib/conversation.functions";
import { endpointsQueryOptions } from "#/features/endpoints/lib/endpoint.functions";
import type { ModelSelection } from "#/features/endpoints/lib/types";

/**
 * All state needed to drive one active chat: the model it's locked to (fixed at
 * creation, read-only here) plus the ephemeral per-send tool toggles. The locked
 * selection only resolves while its endpoint still exists, so a chat on a
 * deleted endpoint can't send.
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
