import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	createConversation,
	defaultSelectionQueryOptions,
} from "#/entities/conversation/conversation.functions";
import type { ModelSelection } from "#/entities/endpoint/types";
import { ChatInput } from "#/features/send-message/components/ChatInput";
import { useChatTools } from "#/features/send-message/hooks/use-chat-tools";
import { storeChatHandoff } from "#/features/send-message/lib/chat-handoff";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "#/shared/ui/empty";

export const Route = createFileRoute("/_authenticated/new")({
	head: () => ({ meta: [{ title: "New chat · localghost" }] }),
	loader: ({ context }) => context.queryClient.ensureQueryData(defaultSelectionQueryOptions()),
	component: NewChatPage,
});

/**
 * The New-chat draft page: a composer with an editable model picker that persists
 * nothing. The first send creates the conversation locked to the chosen model with
 * the message already persisted; the conversation view then requests the response.
 */
function NewChatPage() {
	const navigate = useNavigate();
	const { data: fallback } = useQuery(defaultSelectionQueryOptions());
	const [override, setOverride] = useState<ModelSelection | null>(null);

	// The user's pick wins; otherwise the default selection, but only once it resolves
	// to an endpoint that actually has a model.
	const selection: ModelSelection | null =
		override ??
		(fallback?.endpointId && fallback.model
			? { endpointId: fallback.endpointId, model: fallback.model }
			: null);

	const { controls } = useChatTools({ selection });

	const startChatMutation = useMutation({
		mutationFn: async (firstMessage: string) => {
			if (!selection) throw new Error("No model selected");
			return createConversation({ data: { selection, firstMessage } });
		},
		onSuccess: ({ id }) => {
			storeChatHandoff({
				conversationId: id,
				handoff: { enabledTools: controls.enabledTools },
			});
			navigate({ to: "/chat/$conversationId", params: { conversationId: id } });
		},
		onError: (error) => toast.error("Failed to start the chat", { description: error.message }),
	});

	return (
		<div className="w-full h-full min-h-0 mx-auto max-w-4xl">
			<Empty className="h-full">
				<EmptyHeader>
					<EmptyTitle className="text-2xl">What can I help with?</EmptyTitle>
					<EmptyDescription>
						Start typing. Your chat begins with your first message.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="max-w-xl">
					<ChatInput
						disabled={!selection || startChatMutation.isPending}
						isStreaming={false}
						selection={selection}
						onSelect={setOverride}
						tools={controls}
						isSending={startChatMutation.isPending}
						sendMessage={(content) => startChatMutation.mutate(content)}
					/>
				</EmptyContent>
			</Empty>
		</div>
	);
}
