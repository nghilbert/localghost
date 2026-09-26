import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { chatQueries } from "#/features/chat/chat.queries";
import type { ToolControls } from "#/features/chat/chat.types";
import { defaultEnabledTools } from "#/features/chat/lib/tool-catalog";
import { endpointQueries } from "#/features/endpoint/endpoint.queries";
import type { ModelSelection } from "#/lib/llm-schemas";

/** The tool switches for the next message and whether the model can use tools. */
export function useChatTools({ selection }: { selection: ModelSelection | null }) {
	const { data: capabilities } = useQuery({
		...endpointQueries.capabilities(selection ?? { endpointId: "", model: "" }),
		enabled: Boolean(selection),
	});
	const supportsTools = capabilities?.supportsTools ?? true;
	const supportsImages = capabilities?.supportsImages ?? false;
	const supportsDocuments = capabilities?.supportsDocuments ?? false;

	const { data: availability } = useQuery(chatQueries.toolAvailability());
	const webSearchAvailable = availability?.webSearch ?? false;

	// `null` means untouched, so the defaults apply even if they load late.
	const [override, setOverride] = useState<string[] | null>(null);
	const enabledTools = defaultEnabledTools({
		webSearchAvailable,
		initialEnabledTools: override ?? undefined,
	});
	const resetTools = () => setOverride(null);

	const controls: ToolControls = {
		enabledTools,
		supportsTools,
		onEnabledToolsChange: setOverride,
	};

	return {
		controls,
		supportsImages,
		supportsDocuments,
		toolsToSend: supportsTools ? enabledTools : [],
		resetTools,
	};
}
