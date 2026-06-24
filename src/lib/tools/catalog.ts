/**
 * The user-toggleable built-in tools — pure, client-safe metadata (no server
 * imports), so the chat tools picker can render labels and the stream route can
 * resolve a selected id back to its `ServerTool`. The per-send selection resets
 * to the `defaultOn` set after every message: web search rides along by default
 * so the model can reach for it whenever the user asks for current info, while
 * heavier capabilities stay opt-in to keep the tool count low for small models.
 */
export const TOOL_CATALOG = [
	{
		id: "web_search",
		label: "Web search",
		description: "Look up current information on the web.",
		defaultOn: true,
	},
	{
		id: "memory",
		label: "Memory",
		description: "Save and recall long-term memories about you.",
		defaultOn: false,
	},
] as const;

export type ToolCatalogId = (typeof TOOL_CATALOG)[number]["id"];

/** The catalog ids enabled by default at the start of every message. */
export const DEFAULT_ENABLED_TOOLS: ToolCatalogId[] = TOOL_CATALOG.filter(
	(tool) => tool.defaultOn,
).map((tool) => tool.id);
