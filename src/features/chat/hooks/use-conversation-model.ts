import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { conversationQueryOptions } from "#/features/chat/lib/conversation.functions";
import { endpointsQueryOptions } from "#/features/endpoints/lib/endpoint.functions";
import type { ModelSelection } from "#/features/endpoints/lib/types";

/**
 * Reads the model a conversation is locked to. The model is fixed at creation and
 * never changes here, so this is read-only; it only resolves whether the locked
 * selection is still usable (its endpoint still exists).
 */
export function useConversationModel(conversationId: string) {
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));
	const { data: endpoints, isPending: endpointsPending } = useQuery(endpointsQueryOptions());

	// A selection is usable only while its endpoint exists, so a chat on a deleted
	// endpoint can't send. Optimistic until the list loads.
	const endpointExists =
		endpointsPending || (endpoints?.some((e) => e.id === conversation.endpointId) ?? false);
	const selection: ModelSelection | null =
		conversation.endpointId && conversation.model && endpointExists
			? { endpointId: conversation.endpointId, model: conversation.model }
			: null;

	return { selection, isReady: Boolean(selection) };
}
