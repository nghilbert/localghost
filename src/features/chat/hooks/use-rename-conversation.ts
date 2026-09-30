import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { updateConversation } from "#/features/chat/chat.functions";
import { chatQueries } from "#/features/chat/chat.queries";

/** Renames a conversation. */
export function useRenameConversation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, title }: { id: string; title: string }) =>
			updateConversation({ data: { id, data: { title } } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: chatQueries.list().queryKey }),
		onError: (error) =>
			toast.add({ title: "Failed to rename chat", type: "error", description: error.message }),
	});
}
