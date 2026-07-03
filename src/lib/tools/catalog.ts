import { BrainIcon, GlobeIcon } from "lucide-react";

/**
 * The user-toggleable built-in tools, as client-safe metadata (no server
 * imports). Every tool is opt-in per message; an untouched send hands the
 * model no tools, which keeps small models reliable.
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

/** The catalog ids enabled by default at the start of every message. */
export const DEFAULT_ENABLED_TOOLS: ToolCatalogId[] = [];
