/**
 * The user-toggleable built-in tools — pure, client-safe metadata (no server
 * imports), so the chat tools picker can render labels and the stream route can
 * resolve a selected id back to its `ServerTool`. Always-on tools
 * (search_chats, manage_skills, manage_memory) are intentionally absent; the
 * user never toggles those. MCP servers are toggled separately as `mcp:<id>`.
 */
export const TOOL_CATALOG = [
	{
		id: "web_search",
		label: "Web search",
		description: "Look up current information on the web.",
	},
] as const;

export type ToolCatalogId = (typeof TOOL_CATALOG)[number]["id"];

/** Prefix marking an MCP server in a chat's `enabledTools` list. */
export const MCP_TOOL_PREFIX = "mcp:";
