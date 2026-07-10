import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { modelCapabilitiesQueryOptions } from "#/entities/endpoint/endpoint.functions";
import type { ModelSelection } from "#/entities/endpoint/types";
import type { ToolControls } from "#/features/send-message/components/ChatInput/ToolsMenu";
import { defaultEnabledTools } from "#/features/send-message/lib/tool-catalog";
import { toolAvailabilityQueryOptions } from "#/features/send-message/lib/tools.functions";

/**
 * The ephemeral per-message tool state shared by the New-chat draft page and an
 * active conversation: the model's tool capability plus the toggles. Untouched,
 * the enabled set is the default: web search on when the server offers it.
 */
export function useChatTools({ selection }: { selection: ModelSelection | null }) {
	const { data: capabilities } = useQuery({
		...modelCapabilitiesQueryOptions(selection ?? { endpointId: "", model: "" }),
		enabled: Boolean(selection),
	});
	const supportsTools = capabilities?.supportsTools ?? true;

	const { data: availability } = useQuery(toolAvailabilityQueryOptions());
	const webSearchAvailable = availability?.webSearch ?? false;

	// `null` means untouched: the defaults apply, and keep applying if availability
	// resolves late. An explicit toggle overrides until the next reset.
	const [override, setOverride] = useState<string[] | null>(null);
	const enabledTools = defaultEnabledTools({
		webSearchAvailable,
		initialEnabledTools: override ?? undefined,
	});
	const resetTools = useCallback(() => {
		setOverride(null);
	}, []);

	const controls: ToolControls = {
		enabledTools,
		supportsTools,
		onEnabledToolsChange: setOverride,
	};

	return {
		controls,
		toolsToSend: supportsTools ? enabledTools : [],
		resetTools,
	};
}
