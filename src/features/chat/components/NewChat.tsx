import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Empty } from "#/components/ui/empty";
import { toast } from "#/components/ui/toast";
import { chatQueries } from "#/features/chat/chat.queries";
import { useChatTools } from "#/features/chat/hooks/use-chat-tools";
import { useCreateConversation } from "#/features/chat/hooks/use-create-conversation";
import type { Attachment } from "#/features/chat/lib/attachments";
import { storeNewChat } from "#/features/chat/lib/new-chat";
import type { ModelSelection } from "#/lib/llm-schemas";
import { ChatInput } from "./ChatInput";

/** A new chat. The first send creates the conversation with that message and opens it. */
export function NewChat() {
	const navigate = useNavigate();
	const { data: fallback } = useQuery(chatQueries.defaultSelection());
	const [override, setOverride] = useState<ModelSelection | null>(null);

	// The user's pick, else the default once its endpoint is known to have that model.
	const selection: ModelSelection | null =
		override ??
		(fallback?.endpointId && fallback.model
			? { endpointId: fallback.endpointId, model: fallback.model }
			: null);

	const { controls, supportsImages, supportsDocuments } = useChatTools({ selection });

	const createConversation = useCreateConversation();

	function startChat({
		firstMessage,
		attachments,
	}: {
		firstMessage: string;
		attachments: Attachment[];
	}) {
		if (!selection) {
			toast.add({
				title: "Failed to start the chat",
				type: "error",
				description: "No model selected",
			});
			return;
		}
		createConversation.mutate(
			{ selection, firstMessage, attachments },
			{
				onSuccess: ({ id }) => {
					storeNewChat({
						conversationId: id,
						newChat: { enabledTools: controls.enabledTools },
					});
					// The reply is already streaming, so skip the transition.
					navigate({
						to: "/chat/$conversationId",
						params: { conversationId: id },
						viewTransition: false,
					});
				},
			},
		);
	}

	return (
		<Empty.Root>
			<Empty.Title render={<h1>What can I help with?</h1>} className="text-2xl" />
			<Empty.Description>Start typing. Your chat begins with your first message.</Empty.Description>
			<div className="w-full max-w-xl">
				<ChatInput
					disabled={createConversation.isPending}
					isStreaming={false}
					selection={selection}
					onSelect={setOverride}
					tools={controls}
					supportsImages={supportsImages}
					supportsDocuments={supportsDocuments}
					isSending={createConversation.isPending}
					sendMessage={({ content, attachments }) =>
						startChat({ firstMessage: content, attachments })
					}
				/>
			</div>
		</Empty.Root>
	);
}
