import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { toast } from "#/shared/components/ui/toast";
import {
	approveCodeAgentCommand,
	codeAgentSessionsQueryOptions,
	createCodeAgentSession,
	deleteCodeAgentSession,
} from "./code-agent.functions";
import type { createCodeAgentSessionSchema } from "./schemas";

function useInvalidateCodeAgentSessions() {
	const queryClient = useQueryClient();
	return () =>
		queryClient.invalidateQueries({ queryKey: codeAgentSessionsQueryOptions().queryKey });
}

/** Creates a code-agent session. */
export function useCreateCodeAgentSession() {
	const invalidateSessions = useInvalidateCodeAgentSessions();

	return useMutation({
		mutationFn: (data: z.infer<typeof createCodeAgentSessionSchema>) =>
			createCodeAgentSession({ data }),
		onSuccess: () => invalidateSessions(),
		onError: (error) =>
			toast.add({
				title: "Failed to start the session",
				type: "error",
				description: error.message,
			}),
	});
}

/** Allows a command the agent asked about, for the rest of the session. */
export function useApproveCodeAgentCommand() {
	return useMutation({
		mutationFn: (data: { id: string; approvalId: string }) => approveCodeAgentCommand({ data }),
		onError: (error) =>
			toast.add({
				title: "Failed to allow the command",
				type: "error",
				description: error.message,
			}),
	});
}

/** Deletes a code-agent session, leaving the files it edited in place. */
export function useDeleteCodeAgentSession() {
	const invalidateSessions = useInvalidateCodeAgentSessions();

	return useMutation({
		mutationFn: (id: string) => deleteCodeAgentSession({ data: { id } }),
		onSuccess: async () => {
			await invalidateSessions();
			toast.add({ title: "Session deleted", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to delete the session",
				type: "error",
				description: error.message,
			}),
	});
}
