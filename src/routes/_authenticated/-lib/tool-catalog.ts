import { BrainIcon, GlobeIcon } from "lucide-react";

/**
 * The user-toggleable built-in tools, as client-safe metadata (no server
 * imports). Web search starts enabled whenever the server offers it; every
 * other tool is opt-in per message, which keeps small models reliable.
 */
export const TOOL_CATALOG = [
	{
		id: "web_search",
		label: "Web search",
		description: "Search the web and read pages for current information.",
		icon: GlobeIcon,
	},
	{
		id: "memory",
		label: "Memory",
		description: "Save and recall long-term memories about you.",
		icon: BrainIcon,
	},
] as const;

export type ToolCatalogId = (typeof TOOL_CATALOG)[number]["id"];

/**
 * Resolves a message's enabled tools. An explicit draft handoff takes precedence;
 * otherwise web search starts on only when the server offers it.
 */
export function defaultEnabledTools({
	webSearchAvailable,
	initialEnabledTools,
}: {
	webSearchAvailable: boolean;
	initialEnabledTools?: string[];
}): string[] {
	return initialEnabledTools ?? (webSearchAvailable ? ["web_search"] : []);
}
