import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { updateSession } from "#/features/chat/lib/chat.functions";
import type { updateSessionInput } from "#/features/chat/lib/schemas";

type SessionPatch = z.input<typeof updateSessionInput>["data"];

/** Per-session mutations keyed to one session id (model, mode, settings). */
export function useSession(sessionId: string) {
	const queryClient = useQueryClient();

	const updateSessionMutation = useMutation({
		mutationFn: (data: SessionPatch) => updateSession({ data: { id: sessionId, data } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
			queryClient.invalidateQueries({ queryKey: ["sessions"] });
		},
	});

	return { updateSession: updateSessionMutation };
}
