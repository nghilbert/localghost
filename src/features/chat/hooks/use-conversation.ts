import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useConversationModel } from "#/features/chat/hooks/use-conversation-model";
import { modelCapabilitiesQueryOptions } from "#/features/endpoints/lib/endpoint.functions";
import { DEFAULT_ENABLED_TOOLS } from "#/lib/tools/catalog";

/**
 * All state needed to drive one active chat: DB-backed model selection, ephemeral
 * per-send tool toggles, and the model's capabilities. Used by ChatView only.
 */
export function useConversation(conversationId: string) {
	const { selection, isReady, setSelection } = useConversationModel(conversationId);

	const { data: capabilities } = useQuery({
		...modelCapabilitiesQueryOptions(selection ?? { endpointId: "", model: "" }),
		enabled: Boolean(selection),
	});
	const supportsTools = capabilities?.supportsTools ?? true;

	const [enabledTools, setEnabledTools] = useState<string[]>(DEFAULT_ENABLED_TOOLS);
	const [forceWebSearch, setForceWebSearch] = useState(false);
	const resetTools = useCallback(() => {
		setEnabledTools(DEFAULT_ENABLED_TOOLS);
		setForceWebSearch(false);
	}, []);

	return {
		selection,
		isReady,
		setSelection,
		enabledTools,
		setEnabledTools,
		forceWebSearch,
		setForceWebSearch,
		supportsTools,
		toolsToSend: supportsTools ? [...enabledTools, "web_search"] : [],
		resetTools,
	};
}
