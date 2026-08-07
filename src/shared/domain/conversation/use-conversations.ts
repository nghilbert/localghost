import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/shared/components/ui/toast";
import {
	conversationsQueryOptions,
	deleteConversation,
	updateConversation,
} from "./conversation.functions";

/** Returns the current user's conversations. */
export function useConversationQuery() {
	const { data: conversations = [] } = useQuery(conversationsQueryOptions());

	return conversations;
}

function useInvalidateConversations() {
	const queryClient = useQueryClient();

	return () => queryClient.invalidateQueries({ queryKey: ["conversations"] });
}

/** Renames a conversation. */
export function useRenameConversation() {
	const invalidateConversations = useInvalidateConversations();

	return useMutation({
		mutationFn: ({ id, title }: { id: string; title: string }) =>
			updateConversation({ data: { id, data: { title } } }),
		onSuccess: () => invalidateConversations(),
		onError: (error) =>
			toast.add({ title: "Failed to rename chat", type: "error", description: error.message }),
	});
}

/** Deletes a conversation. */
export function useDeleteConversation() {
	const invalidateConversations = useInvalidateConversations();

	return useMutation({
		mutationFn: (id: string) => deleteConversation({ data: { id } }),
		onSuccess: async () => {
			await invalidateConversations();
			toast.add({ title: "Chat deleted", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to delete chat", type: "error", description: error.message }),
	});
}
