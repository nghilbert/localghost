import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	conversationsQueryOptions,
	createConversation,
} from "#/features/chat/lib/conversation.functions";
import { useEndpoints } from "#/features/endpoints/hooks/use-endpoints";
import { endpointModelsQueryOptions } from "#/features/endpoints/lib/endpoint.functions";
import type { ModelSelection } from "#/features/endpoints/lib/types";

/**
 * The first message typed on `/new`, keyed by the conversation it created. Stashed
 * here and taken once by the conversation view to send. Reads once and clears, so it
 * can never re-send (for example on a later back-navigation to the same conversation).
 */
const pendingMessages = new Map<string, string>();

export function takePendingMessage(conversationId: string): string | undefined {
	const text = pendingMessages.get(conversationId);
	pendingMessages.delete(conversationId);
	return text;
}

/**
 * Creates the conversation row for the `/new` composer on first send, stashes that
 * first message for the conversation view to stream, and navigates to it. Deferring
 * row creation until send means an abandoned `/new` leaves nothing behind.
 * New chats always start with the first available endpoint and model.
 */
export function useCreateConversation() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { endpoints } = useEndpoints();

	const firstEndpoint = endpoints[0];
	const { data: firstModels = [] } = useQuery({
		...endpointModelsQueryOptions(firstEndpoint?.id ?? ""),
		enabled: Boolean(firstEndpoint),
	});
	const selection: ModelSelection | null =
		firstEndpoint && firstModels[0]
			? { endpointId: firstEndpoint.id, model: firstModels[0] }
			: null;

	const mutation = useMutation({
		mutationFn: (_content: string) =>
			createConversation({
				data: { endpointId: selection?.endpointId, model: selection?.model ?? "" },
			}),
		onSuccess: (conversation, content) => {
			pendingMessages.set(conversation.id, content);
			queryClient.invalidateQueries({ queryKey: conversationsQueryOptions().queryKey });
			navigate({ to: "/chat/$conversationId", params: { conversationId: conversation.id } });
		},
		onError: () => toast.error("Failed to start chat"),
	});
	return { ...mutation, isReady: Boolean(selection) };
}
