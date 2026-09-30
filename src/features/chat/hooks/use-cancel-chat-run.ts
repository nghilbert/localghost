import { useMutation } from "@tanstack/react-query";
import { requestChatRunCancel } from "#/features/chat/chat.functions";

/** Marks a chat run as cancelled. Disconnect the stream after it settles, success or not. */
export function useCancelChatRun() {
	return useMutation({
		mutationFn: (runId: string) => requestChatRunCancel({ data: runId }),
	});
}
