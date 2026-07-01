import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type { ToolControls } from "#/features/chat/components/ChatInput/ToolsMenu";
import { modelCapabilitiesQueryOptions } from "#/features/endpoints/lib/endpoint.functions";
import type { ModelSelection } from "#/features/endpoints/lib/types";
import { DEFAULT_ENABLED_TOOLS } from "#/lib/tools/catalog";

/**
 * The ephemeral per-message tool state shared by the New-chat draft page and an
 * active conversation: the model's tool capability plus the opt-in toggles. Seeds
 * accept the draft's handoff so the first message keeps the choices made before send.
 */
export function useChatTools({
	selection,
	initialEnabledTools = DEFAULT_ENABLED_TOOLS,
	initialForceWebSearch = false,
}: {
	selection: ModelSelection | null;
	initialEnabledTools?: string[];
	initialForceWebSearch?: boolean;
}) {
	const { data: capabilities } = useQuery({
		...modelCapabilitiesQueryOptions(selection ?? { endpointId: "", model: "" }),
		enabled: Boolean(selection),
	});
	const supportsTools = capabilities?.supportsTools ?? true;

	const [enabledTools, setEnabledTools] = useState<string[]>(initialEnabledTools);
	const [forceWebSearch, setForceWebSearch] = useState(initialForceWebSearch);
	const resetTools = useCallback(() => {
		setEnabledTools(DEFAULT_ENABLED_TOOLS);
		setForceWebSearch(false);
	}, []);

	const controls: ToolControls = {
		enabledTools,
		forceWebSearch,
		supportsTools,
		onEnabledToolsChange: setEnabledTools,
		onForceWebSearchChange: setForceWebSearch,
	};

	return {
		controls,
		forceWebSearch,
		toolsToSend: supportsTools ? [...enabledTools, "web_search"] : [],
		resetTools,
	};
}
