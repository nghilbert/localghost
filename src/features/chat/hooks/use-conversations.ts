import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	conversationsQueryOptions,
	createConversation,
	deleteConversation,
	updateConversation,
} from "#/features/chat/lib/conversation.functions";

/** Conversation list plus the create / rename / archive / delete mutations. */
export function useConversations() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["conversations"] });
	const { data: conversations = [] } = useQuery(conversationsQueryOptions());

	const createConversationMutation = useMutation({
		mutationFn: () => createConversation({ data: { title: "New Chat" } }),
		onSuccess: (conversation) => {
			invalidate();
			navigate({ to: "/chat/$conversationId", params: { conversationId: conversation.id } });
		},
	});

	const renameConversationMutation = useMutation({
		mutationFn: ({ id, title }: { id: string; title: string }) =>
			updateConversation({ data: { id, data: { title } } }),
		onSuccess: invalidate,
	});

	const archiveConversationMutation = useMutation({
		mutationFn: (id: string) => updateConversation({ data: { id, data: { archived: true } } }),
		onSuccess: () => {
			invalidate();
			toast.success("Chat archived");
		},
		onError: (error) => toast.error(`Failed to archive chat: ${error.message}`),
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
		createConversation: createConversationMutation,
		renameConversation: renameConversationMutation,
		archiveConversation: archiveConversationMutation,
		deleteConversation: deleteConversationMutation,
	};
}
