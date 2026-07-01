import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { ChatInput } from "#/features/chat/components/ChatInput";
import { useChatTools } from "#/features/chat/hooks/use-chat-tools";
import {
	createConversation,
	defaultSelectionQueryOptions,
} from "#/features/chat/lib/conversation.functions";
import type { ModelSelection } from "#/features/endpoints/lib/types";

/**
 * The New-chat draft page: a composer with an editable model picker that persists
 * nothing. The first send creates the conversation locked to the chosen model, then
 * hands the message and tool choices to the conversation view to send once.
 */
export function NewChatView() {
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

	const { controls, forceWebSearch } = useChatTools({ selection });

	const start = useMutation({
		mutationFn: async (firstMessage: string) => {
			if (!selection) throw new Error("No model selected");
			const { id } = await createConversation({ data: { selection } });
			return { id, firstMessage };
		},
		onSuccess: ({ id, firstMessage }) => {
			navigate({
				to: "/chat/$conversationId",
				params: { conversationId: id },
				state: (prev) => ({
					...prev,
					firstMessage,
					enabledTools: controls.enabledTools,
					forceWebSearch,
				}),
			});
		},
		onError: () => toast.error("Couldn't start the chat"),
	});

	return (
		<Empty className="h-full">
			<EmptyHeader>
				<EmptyTitle className="text-2xl">What can I help with?</EmptyTitle>
				<EmptyDescription>Start typing. Your chat begins with your first message.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent className="max-w-xl">
				<ChatInput
					disabled={!selection || start.isPending}
					isStreaming={false}
					selection={selection}
					onSelect={setOverride}
					tools={controls}
					sendMessage={(content) => start.mutate(content)}
				/>
			</EmptyContent>
		</Empty>
	);
}
