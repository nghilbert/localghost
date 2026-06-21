import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	conversationQueryOptions,
	conversationsQueryOptions,
	updateConversation,
} from "#/features/chat/lib/conversation.functions";

type ConversationPatch = Parameters<typeof updateConversation>[0]["data"]["data"];

/**
 * Single source of truth for a conversation's configuration. Reads the
 * cache-backed row (preloaded by the route loader) and writes every change through
 * one mutation, so settings stay consistent with the query cache instead of being
 * mirrored into local component state.
 */
export function useConversationSettings(conversationId: string) {
	const queryClient = useQueryClient();
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));

	const patch = useMutation({
		mutationFn: (data: ConversationPatch) =>
			updateConversation({ data: { id: conversationId, data } }),
		onSuccess: (updated) => {
			// Write the fresh row straight into the cache (no refetch); the sidebar
			// list still refetches so its model label stays in step.
			queryClient.setQueryData(conversationQueryOptions(conversationId).queryKey, updated);
			queryClient.invalidateQueries({ queryKey: conversationsQueryOptions().queryKey });
		},
		onError: () => toast.error("Failed to save settings"),
	});

	return {
		model: conversation.model,
		endpointId: conversation.endpointId,
		provider: conversation.endpoint?.provider,
		isReady: Boolean(conversation.model && conversation.endpointId),
		setModel: (endpointId: string, model: string) => patch.mutate({ endpointId, model }),
	};
}
