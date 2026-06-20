/**
 * The user-toggleable built-in tools — pure, client-safe metadata (no server
 * imports), so the chat tools picker can render labels and the stream route can
 * resolve a selected id back to its `ServerTool`. Every built-in capability is
 * opt-in per send: nothing is given to the model unless the user toggles it,
 * which keeps the tool count low for small models. MCP servers are toggled
 * separately as `mcp:<id>`.
 */
export const TOOL_CATALOG = [
	{
		id: "web_search",
		label: "Web search",
		description: "Look up current information on the web.",
	},
	{
		id: "memory",
		label: "Memory",
		description: "Save and recall long-term memories about you.",
	},
	{
		id: "search_chats",
		label: "Search chats",
		description: "Let the assistant search your past conversations.",
	},
	{
		id: "manage_skills",
		label: "Skills",
		description: "Let the assistant read and manage your saved skills.",
	},
] as const;

export type ToolCatalogId = (typeof TOOL_CATALOG)[number]["id"];

/** Prefix marking an MCP server in a chat's `enabledTools` list. */
export const MCP_TOOL_PREFIX = "mcp:";
