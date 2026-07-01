import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	conversationQueryOptions,
	conversationsQueryOptions,
	updateConversation,
} from "#/features/chat/lib/conversation.functions";
import { endpointsQueryOptions } from "#/features/endpoints/lib/endpoint.functions";
import type { ModelSelection } from "#/features/endpoints/lib/types";

/**
 * Reads and writes the model selection for one conversation. The selection is
 * DB-backed so it survives page reload. Used by ModelPicker to stay self-contained.
 */
export function useConversationModel(conversationId: string) {
	const queryClient = useQueryClient();
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));
	const { data: endpoints, isPending: endpointsPending } = useQuery(endpointsQueryOptions());

	const patch = useMutation({
		mutationFn: (selection: ModelSelection) =>
			updateConversation({ data: { id: conversationId, data: { selection } } }),
		onSuccess: (updated) => {
			queryClient.setQueryData(conversationQueryOptions(conversationId).queryKey, updated);
			queryClient.invalidateQueries({ queryKey: conversationsQueryOptions().queryKey });
		},
		onError: () => toast.error("Failed to save settings"),
	});

	// A selection is usable only while its endpoint exists, so a chat on a deleted
	// endpoint re-prompts instead of sending. Optimistic until the list loads.
	const endpointExists =
		endpointsPending || (endpoints?.some((e) => e.id === conversation.endpointId) ?? false);
	const selection: ModelSelection | null =
		conversation.endpointId && conversation.model && endpointExists
			? { endpointId: conversation.endpointId, model: conversation.model }
			: null;

	return {
		selection,
		isReady: Boolean(selection),
		setSelection: (next: ModelSelection) => patch.mutate(next),
	};
}
