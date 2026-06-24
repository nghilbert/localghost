import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { modelCapabilitiesQueryOptions } from "#/features/endpoints/lib/endpoint.functions";
import { DEFAULT_ENABLED_TOOLS } from "#/lib/tools/catalog";

/**
 * Owns the conversation's ephemeral per-send tool selection. The selection
 * starts from {@link DEFAULT_ENABLED_TOOLS} (web search on) and `resetTools`
 * returns it there after each message, so a manual toggle only affects the
 * message it was made for. `toolsToSend` gates the selection at send time — a
 * tool-less model always sends `[]` without the selection being cleared — so
 * switching models never mutates the user's choice behind their back.
 */
export function useChatTools(endpointId: string | null | undefined, model: string) {
	const [enabledTools, setEnabledTools] = useState<string[]>(DEFAULT_ENABLED_TOOLS);
	const resetTools = useCallback(() => setEnabledTools(DEFAULT_ENABLED_TOOLS), []);

	const { data: capabilities } = useQuery({
		...modelCapabilitiesQueryOptions(endpointId ?? "", model),
		enabled: Boolean(endpointId && model),
	});
	const supportsTools = capabilities?.supportsTools ?? true;

	return {
		enabledTools,
		setEnabledTools,
		resetTools,
		supportsTools,
		toolsToSend: supportsTools ? enabledTools : [],
	};
}
