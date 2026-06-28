import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	conversationQueryOptions,
	conversationsQueryOptions,
	updateConversation,
} from "#/features/chat/lib/conversation.functions";
import type { ModelSelection } from "#/features/endpoints/lib/types";

/**
 * Reads and writes the model selection for one conversation. The selection is
 * DB-backed so it survives page reload. Used by ModelPicker to stay self-contained.
 */
export function useConversationModel(conversationId: string) {
	const queryClient = useQueryClient();
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));

	const patch = useMutation({
		mutationFn: (data: ModelSelection) =>
			updateConversation({ data: { id: conversationId, data } }),
		onSuccess: (updated) => {
			queryClient.setQueryData(conversationQueryOptions(conversationId).queryKey, updated);
			queryClient.invalidateQueries({ queryKey: conversationsQueryOptions().queryKey });
		},
		onError: () => toast.error("Failed to save settings"),
	});

	const selection: ModelSelection | null =
		conversation.endpointId && conversation.model
			? { endpointId: conversation.endpointId, model: conversation.model }
			: null;

	return {
		selection,
		isReady: Boolean(selection),
		setSelection: (next: ModelSelection) => patch.mutate(next),
	};
}
