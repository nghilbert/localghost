import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { modelCapabilitiesQueryOptions } from "#/entities/endpoint/endpoint.functions";
import type { ModelSelection } from "#/entities/endpoint/types";
import type { ToolControls } from "#/features/send-message/components/ChatInput/ToolsMenu";
import { DEFAULT_ENABLED_TOOLS } from "#/shared/lib/tools/catalog";

/**
 * The ephemeral per-message tool state shared by the New-chat draft page and an
 * active conversation: the model's tool capability plus the opt-in toggles. Seeds
 * accept the draft's handoff so the first message keeps the choices made before send.
 */
export function useChatTools({
	selection,
	initialEnabledTools = DEFAULT_ENABLED_TOOLS,
}: {
	selection: ModelSelection | null;
	initialEnabledTools?: string[];
}) {
	const { data: capabilities } = useQuery({
		...modelCapabilitiesQueryOptions(selection ?? { endpointId: "", model: "" }),
		enabled: Boolean(selection),
	});
	const supportsTools = capabilities?.supportsTools ?? true;

	const [enabledTools, setEnabledTools] = useState<string[]>(initialEnabledTools);
	const resetTools = useCallback(() => {
		setEnabledTools(DEFAULT_ENABLED_TOOLS);
	}, []);

	const controls: ToolControls = {
		enabledTools,
		supportsTools,
		onEnabledToolsChange: setEnabledTools,
	};

	return {
		controls,
		toolsToSend: supportsTools ? enabledTools : [],
		resetTools,
	};
}
