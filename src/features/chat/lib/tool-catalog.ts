import { GlobeIcon } from "lucide-react";

/**
 * The built-in tools a user can turn on per message. Memory is not here, since it is
 * always on.
 */
export const TOOL_CATALOG = [
	{
		id: "web_search",
		label: "Web search",
		description: "Search the web and read pages for current information.",
		icon: GlobeIcon,
	},
] as const;

/** A message's starting tools: those a new chat carried over, else web search when the server offers it. */
export function defaultEnabledTools({
	webSearchAvailable,
	initialEnabledTools,
}: {
	webSearchAvailable: boolean;
	initialEnabledTools?: string[];
}): string[] {
	return initialEnabledTools ?? (webSearchAvailable ? ["web_search"] : []);
}
