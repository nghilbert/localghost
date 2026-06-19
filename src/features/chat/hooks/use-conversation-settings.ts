import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	conversationQueryOptions,
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
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
			queryClient.invalidateQueries({ queryKey: ["conversations"] });
			toast.success("Settings saved");
		},
		onError: () => toast.error("Failed to save settings"),
	});

	const mode: "chat" | "agent" = conversation.mode === "agent" ? "agent" : "chat";

	return {
		mode,
		model: conversation.model,
		endpointId: conversation.endpointId,
		isReady: Boolean(conversation.model && conversation.endpointId),
		setMode: (value: "chat" | "agent") => patch.mutate({ mode: value }),
		setModel: (endpointId: string, model: string) => patch.mutate({ endpointId, model }),
	};
}
