import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { chatQueries } from "#/features/chat/chat.queries";
import {
	conversationExportFilename,
	conversationToJson,
	conversationToMarkdown,
} from "#/features/chat/lib/chat-export";
import { downloadTextFile } from "#/lib/download";

/** Downloads a chat as a Markdown or JSON file. */
export function useExportConversation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, format }: { id: string; format: "markdown" | "json" }) => {
			const conversation = await queryClient.query({
				...chatQueries.detail(id),
				staleTime: "static",
			});
			const extension = format === "markdown" ? "md" : "json";
			downloadTextFile({
				filename: conversationExportFilename({ title: conversation.title, extension }),
				text:
					format === "markdown"
						? conversationToMarkdown(conversation)
						: conversationToJson(conversation),
				type: format === "markdown" ? "text/markdown" : "application/json",
			});
		},
		onSuccess: () => toast.add({ title: "Chat exported", type: "success" }),
		onError: (error) =>
			toast.add({ title: "Failed to export chat", type: "error", description: error.message }),
	});
}
