import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChatInput } from "#/features/chat/components/ChatView/ChatInput";
import {
	conversationsQueryOptions,
	createConversation,
} from "#/features/chat/lib/conversation.functions";

/**
 * The first message typed on `/new`, keyed by the conversation it created. Stashed
 * here and taken once by the conversation view to send — read-once-and-cleared, so
 * it can never re-send (e.g. on a later back-navigation to the same conversation).
 */
const pendingMessages = new Map<string, string>();

export function takePendingMessage(conversationId: string): string | undefined {
	const text = pendingMessages.get(conversationId);
	pendingMessages.delete(conversationId);
	return text;
}

/**
 * The landing composer. Creates no conversation row — it only picks a model and
 * holds the first message, then creates the row on send and hands that message to
 * the conversation view to stream (so an abandoned `/new` leaves nothing behind).
 */
export function NewChat() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: conversations = [] } = useQuery(conversationsQueryOptions());

	// Seed the picker from the most recent chat so a new chat keeps the last model.
	const recent = conversations[0];
	const [model, setModel] = useState(recent?.model ?? "");
	const [endpointId, setEndpointId] = useState<string | null>(recent?.endpointId ?? null);
	const isReady = Boolean(model && endpointId);

	const start = useMutation({
		mutationFn: (_content: string) =>
			createConversation({ data: { endpointId: endpointId ?? undefined, model } }),
		onSuccess: (conversation, content) => {
			pendingMessages.set(conversation.id, content);
			queryClient.invalidateQueries({ queryKey: conversationsQueryOptions().queryKey });
			navigate({ to: "/chat/$conversationId", params: { conversationId: conversation.id } });
		},
		onError: () => toast.error("Failed to start chat"),
	});

	return (
		<div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-4 px-4">
			<div className="space-y-1 text-center">
				<h1 className="font-semibold text-2xl">What can I help with?</h1>
				<p className="text-muted-foreground text-sm">
					Pick a model and start typing — your chat begins with your first message.
				</p>
			</div>

			<div className="w-full">
				<ChatInput
					model={model}
					endpointId={endpointId}
					isReady={isReady}
					onModelSelect={(ep, m) => {
						setEndpointId(ep);
						setModel(m);
					}}
					isStreaming={start.isPending}
					sendMessage={(content) => start.mutateAsync(content).then(() => undefined)}
					stop={() => undefined}
				/>
			</div>
		</div>
	);
}
