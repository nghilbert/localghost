/**
 * The user-toggleable built-in tools. Pure, client-safe metadata (no server
 * imports), so the chat tools picker can render labels and the stream route can
 * resolve a selected id back to its `ServerTool`. Web search is not listed here:
 * it's offered to every tool-capable model automatically, with a separate "force
 * a search this turn" toggle. The remaining catalog tools stay opt-in to keep the
 * tool count low for small models.
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
