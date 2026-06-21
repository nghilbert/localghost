import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { modelCapabilitiesQueryOptions } from "#/features/endpoints/lib/endpoint.functions";

/**
 * Owns the conversation's ephemeral per-send tool selection. Holds the
 * `enabledTools` state the user toggles in the picker and derives whether the
 * current model can use tools at all. `toolsToSend` gates the selection at send
 * time — a tool-less model always sends `[]` without the selection being cleared
 * — so switching models never mutates the user's choice behind their back.
 */
export function useChatTools(endpointId: string | null | undefined, model: string) {
	const [enabledTools, setEnabledTools] = useState<string[]>([]);

	const { data: capabilities } = useQuery({
		...modelCapabilitiesQueryOptions(endpointId ?? "", model),
		enabled: Boolean(endpointId && model),
	});
	const supportsTools = capabilities?.supportsTools ?? true;

	return {
		enabledTools,
		setEnabledTools,
		supportsTools,
		toolsToSend: supportsTools ? enabledTools : [],
	};
}
