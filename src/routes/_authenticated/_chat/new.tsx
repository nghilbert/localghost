import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useChatTools } from "#/routes/_authenticated/_chat/-hooks/use-chat-tools";
import type { Attachment } from "#/routes/_authenticated/_chat/-lib/attachments";
import { storeChatHandoff } from "#/routes/_authenticated/_chat/-lib/handoff";
import { ChatInput } from "#/routes/_authenticated/-components/ChatInput";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/shared/components/ui/empty";
import { toast } from "#/shared/components/ui/toast";
import {
	createConversation,
	defaultSelectionQueryOptions,
} from "#/shared/domain/conversation/conversation.functions";
import type { ModelSelection } from "#/shared/domain/endpoint/schemas";

export const Route = createFileRoute("/_authenticated/_chat/new")({
	head: () => ({ meta: [{ title: "New chat · localghost" }] }),
	loader: ({ context }) =>
		context.queryClient.query({
			...defaultSelectionQueryOptions(),
			staleTime: "static",
		}),
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

	const { controls, supportsImages, supportsDocuments } = useChatTools({ selection });

	const startChatMutation = useMutation({
		mutationFn: async ({
			firstMessage,
			attachments,
		}: {
			firstMessage: string;
			attachments: Attachment[];
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
		onError: (error) =>
			toast.add({ title: "Failed to start the chat", type: "error", description: error.message }),
	});

	return (
		<Empty>
			<EmptyHeader>
				<EmptyTitle className="text-2xl">What can I help with?</EmptyTitle>
				<EmptyDescription>Start typing. Your chat begins with your first message.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent className="max-w-xl">
				<ChatInput
					disabled={startChatMutation.isPending}
					isStreaming={false}
					selection={selection}
					onSelect={setOverride}
					tools={controls}
					supportsImages={supportsImages}
					supportsDocuments={supportsDocuments}
					isSending={startChatMutation.isPending}
					sendMessage={(content, attachments) =>
						startChatMutation.mutate({ firstMessage: content, attachments })
					}
				/>
			</EmptyContent>
		</Empty>
	);
}
