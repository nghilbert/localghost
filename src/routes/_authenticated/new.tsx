import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChatInput } from "#/routes/_authenticated/-components/chat/ChatInput";
import { useChatTools } from "#/routes/_authenticated/-hooks/use-chat-tools";
import type { ImageAttachment } from "#/routes/_authenticated/-lib/attachments";
import { storeChatHandoff } from "#/routes/_authenticated/-lib/chat-handoff";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/shared/components/ui/empty";
import {
	createConversation,
	defaultSelectionQueryOptions,
} from "#/shared/domain/conversation/conversation.functions";
import type { ModelSelection } from "#/shared/domain/endpoint/types";

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

	const { controls, supportsImages } = useChatTools({ selection });

	const startChatMutation = useMutation({
		mutationFn: async ({
			firstMessage,
			attachments,
		}: {
			firstMessage: string;
			attachments: ImageAttachment[];
		}) => {
			if (!selection) throw new Error("No model selected");
			return createConversation({ data: { selection, firstMessage, attachments } });
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
						supportsImages={supportsImages}
						isSending={startChatMutation.isPending}
						sendMessage={(content, attachments) =>
							startChatMutation.mutate({ firstMessage: content, attachments })
						}
					/>
				</EmptyContent>
			</Empty>
		</div>
	);
}
