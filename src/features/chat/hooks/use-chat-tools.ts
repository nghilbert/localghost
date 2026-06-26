import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { modelCapabilitiesQueryOptions } from "#/features/endpoints/lib/endpoint.functions";
import { DEFAULT_ENABLED_TOOLS } from "#/lib/tools/catalog";

/**
 * Owns the conversation's ephemeral per-send tool selection: the opt-in catalog
 * tools (memory) plus a `forceWebSearch` flag. Web search is always offered to a
 * tool-capable model so it can reach for it whenever it helps — `forceWebSearch`
 * only changes whether the model is *told* to search this turn. `resetTools`
 * returns everything to its default after each message, so a toggle lasts one
 * message. `toolsToSend` gates the selection at send time: a tool-less model
 * always sends `[]` (without clearing the selection), and web search rides along
 * for capable models — so switching models never mutates the user's choice.
 */
export function useChatTools(endpointId: string | null | undefined, model: string) {
	const [enabledTools, setEnabledTools] = useState<string[]>(DEFAULT_ENABLED_TOOLS);
	const [forceWebSearch, setForceWebSearch] = useState(false);
	const resetTools = useCallback(() => {
		setEnabledTools(DEFAULT_ENABLED_TOOLS);
		setForceWebSearch(false);
	}, []);

	const { data: capabilities } = useQuery({
		...modelCapabilitiesQueryOptions(endpointId ?? "", model),
		enabled: Boolean(endpointId && model),
	});
	const supportsTools = capabilities?.supportsTools ?? true;

	return {
		enabledTools,
		setEnabledTools,
		forceWebSearch,
		setForceWebSearch,
		resetTools,
		supportsTools,
		toolsToSend: supportsTools ? [...enabledTools, "web_search"] : [],
	};
}
