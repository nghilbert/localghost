import { useMutation } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { exportConversation } from "#/features/chat/chat.functions";
import { downloadTextFile } from "#/lib/download";

/** Downloads a chat as a Markdown or JSON file. */
export function useExportConversation() {
	return useMutation({
		mutationFn: async (data: { id: string; format: "markdown" | "json" }) => {
			downloadTextFile(await exportConversation({ data }));
		},
		onSuccess: () => toast.add({ title: "Chat exported", type: "success" }),
		onError: (error) =>
			toast.add({ title: "Failed to export chat", type: "error", description: error.message }),
	});
}
