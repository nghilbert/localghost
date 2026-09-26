import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { toast } from "#/components/ui/toast";
import { createConversation } from "#/features/chat/chat.functions";
import { chatQueries } from "#/features/chat/chat.queries";
import type { createConversationInput } from "#/features/chat/chat.schemas";

/** Creates a conversation from a new chat's first message. */
export function useCreateConversation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: z.input<typeof createConversationInput>) =>
			createConversation({ data: input }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: chatQueries.list().queryKey }),
		onError: (error) =>
			toast.add({ title: "Failed to start the chat", type: "error", description: error.message }),
	});
}
