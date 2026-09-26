import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { chatQueries } from "#/features/chat/chat.queries";
import { endpointQueries } from "#/features/endpoint/endpoint.queries";
import type { ModelSelection } from "#/lib/llm-schemas";
import { useChatTools } from "./use-chat-tools";

/** A conversation's model and tool switches. The model is null once its endpoint is deleted. */
export function useConversation({ conversationId }: { conversationId: string }) {
	const { data: conversation } = useSuspenseQuery(chatQueries.detail(conversationId));
	const { data: endpoints, isPending: endpointsPending } = useQuery(endpointQueries.list());

	// Assumed to exist until the endpoint list loads.
	const endpointExists =
		endpointsPending || (endpoints?.some((e) => e.id === conversation.endpointId) ?? false);
	const selection: ModelSelection | null =
		conversation.endpointId && conversation.model && endpointExists
			? { endpointId: conversation.endpointId, model: conversation.model }
			: null;

	const tools = useChatTools({ selection });
	return { selection, isReady: Boolean(selection), ...tools };
}
