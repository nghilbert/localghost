import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/shared/components/ui/toast";
import {
	conversationsQueryOptions,
	deleteConversation,
	updateConversation,
} from "./conversation.functions";

/** Conversation list plus the rename / delete mutations. */
export function useConversations() {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["conversations"] });
	const { data: conversations = [] } = useQuery(conversationsQueryOptions());

	const renameConversationMutation = useMutation({
		mutationFn: ({ id, title }: { id: string; title: string }) =>
			updateConversation({ data: { id, data: { title } } }),
		onSuccess: invalidate,
		onError: (error) =>
			toast.add({ title: "Failed to rename chat", type: "error", description: error.message }),
	});

	const deleteConversationMutation = useMutation({
		mutationFn: (id: string) => deleteConversation({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.add({ title: "Chat deleted", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to delete chat", type: "error", description: error.message }),
	});

	return {
		conversations,
		renameConversation: renameConversationMutation,
		deleteConversation: deleteConversationMutation,
	};
}
