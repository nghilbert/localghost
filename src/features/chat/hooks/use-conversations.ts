import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	conversationsQueryOptions,
	deleteConversation,
	updateConversation,
} from "#/features/chat/lib/conversation.functions";

/** Conversation list plus the rename / delete mutations. */
export function useConversations() {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["conversations"] });
	const { data: conversations = [] } = useQuery(conversationsQueryOptions());

	const renameConversationMutation = useMutation({
		mutationFn: ({ id, title }: { id: string; title: string }) =>
			updateConversation({ data: { id, data: { title } } }),
		onSuccess: invalidate,
		onError: (error) => toast.error(`Failed to rename chat: ${error.message}`),
	});

	const deleteConversationMutation = useMutation({
		mutationFn: (id: string) => deleteConversation({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Chat deleted");
		},
		onError: (error) => toast.error(`Failed to delete chat: ${error.message}`),
	});

	return {
		conversations,
		renameConversation: renameConversationMutation,
		deleteConversation: deleteConversationMutation,
	};
}
