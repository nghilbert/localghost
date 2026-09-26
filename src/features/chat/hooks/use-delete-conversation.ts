import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { deleteConversation } from "#/features/chat/chat.functions";
import { chatQueries } from "#/features/chat/chat.queries";

/** Deletes a conversation. */
export function useDeleteConversation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteConversation({ data: { id } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: chatQueries.list().queryKey });
			toast.add({ title: "Chat deleted", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to delete chat", type: "error", description: error.message }),
	});
}
