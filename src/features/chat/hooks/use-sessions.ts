import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	createSession,
	forkSession,
	sessionsQueryOptions,
	updateSession,
} from "#/features/chat/lib/chat.functions";

export function useSessions() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["sessions"] });
	const { data: sessions = [] } = useQuery(sessionsQueryOptions());

	const createSessionMutation = useMutation({
		mutationFn: () => createSession({ data: { name: "New Chat" } }),
		onSuccess: (session) => {
			invalidate();
			navigate({ to: "/sessions/$sessionId", params: { sessionId: session.id } });
		},
	});

	const renameSessionMutation = useMutation({
		mutationFn: ({ id, name }: { id: string; name: string }) =>
			updateSession({ data: { id, data: { name } } }),
		onSuccess: invalidate,
	});

	const archiveSessionMutation = useMutation({
		mutationFn: (id: string) => updateSession({ data: { id, data: { archived: true } } }),
		onSuccess: () => {
			invalidate();
			toast.success("Chat archived");
		},
		onError: (error) => toast.error(`Failed to archive chat: ${error.message}`),
	});

	const forkSessionMutation = useMutation({
		mutationFn: (id: string) => forkSession({ data: { id } }),
		onSuccess: (result) => {
			invalidate();
			navigate({ to: "/sessions/$sessionId", params: { sessionId: result.id } });
		},
	});

	return {
		sessions,
		createSession: createSessionMutation,
		renameSession: renameSessionMutation,
		archiveSession: archiveSessionMutation,
		forkSession: forkSessionMutation,
	};
}
