/**
 * The user-toggleable built-in tools, as client-safe metadata (no server
 * imports). Web search is absent: every tool-capable model gets it, with its
 * own "force a search" toggle. The rest stay opt-in for small models' sake.
 */
export const TOOL_CATALOG = [
	{
		id: "memory",
		label: "Memory",
		description: "Save and recall long-term memories about you.",
	},
] as const;

export type ToolCatalogId = (typeof TOOL_CATALOG)[number]["id"];

/** The catalog ids enabled by default at the start of every message. */
export const DEFAULT_ENABLED_TOOLS: ToolCatalogId[] = [];
