import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useChatTools } from "#/routes/_authenticated/-hooks/use-chat-tools";
import { conversationQueryOptions } from "#/shared/domain/conversation/conversation.functions";
import { historyBudgetTokens } from "#/shared/domain/conversation/messages";
import { endpointsQueryOptions } from "#/shared/domain/endpoint/endpoint.functions";
import type { ModelSelection } from "#/shared/domain/endpoint/types";
import { modelSettingQueryOptions } from "#/shared/domain/model-setting/model-setting.functions";

/** A stored JSON options blob narrowed to a plain record for merging, `{}` when absent. */
function asOptionsRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? { ...value } : {};
}

/**
 * State driving one active chat: the model it's locked to (fixed at creation)
 * plus the ephemeral per-send tool toggles. The locked selection only resolves
 * while its endpoint exists, so a chat on a deleted endpoint can't send.
 */
export function useConversation({ conversationId }: { conversationId: string }) {
	const { data: conversation } = useSuspenseQuery(conversationQueryOptions(conversationId));
	const { data: endpoints, isPending: endpointsPending } = useQuery(endpointsQueryOptions());

	// Optimistic until the endpoint list loads.
	const endpointExists =
		endpointsPending || (endpoints?.some((e) => e.id === conversation.endpointId) ?? false);
	const selection: ModelSelection | null =
		conversation.endpointId && conversation.model && endpointExists
			? { endpointId: conversation.endpointId, model: conversation.model }
			: null;

	// Per-model options carry a num_ctx override; needed so the divider lands on
	// the same message the server's token trim will cut at.
	const { data: modelSetting } = useQuery({
		...modelSettingQueryOptions(selection ?? { endpointId: "", model: "" }),
		enabled: Boolean(selection),
	});

	const endpoint = endpoints?.find((e) => e.id === conversation.endpointId);
	const historyBudget =
		selection && endpoint
			? historyBudgetTokens({
					provider: endpoint.provider,
					options: {
						...asOptionsRecord(endpoint.options),
						...asOptionsRecord(modelSetting),
					},
				})
			: undefined;

	const tools = useChatTools({ selection });
	return { selection, isReady: Boolean(selection), historyBudget, ...tools };
}
