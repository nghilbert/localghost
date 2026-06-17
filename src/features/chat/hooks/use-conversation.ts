import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { updateConversation } from "#/features/chat/lib/conversation.functions";
import type { updateConversationInput } from "#/features/chat/lib/schemas";

type ConversationPatch = z.input<typeof updateConversationInput>["data"];

/** Per-conversation config mutations keyed to one conversation id (model, mode, settings). */
export function useConversation(conversationId: string) {
	const queryClient = useQueryClient();

	const updateConversationMutation = useMutation({
		mutationFn: (data: ConversationPatch) =>
			updateConversation({ data: { id: conversationId, data } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
			queryClient.invalidateQueries({ queryKey: ["conversations"] });
		},
	});

	return { updateConversation: updateConversationMutation };
}
