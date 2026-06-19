import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export type McpServerConfig = {
	id: string;
	name: string;
	url: string;
	type: string;
};

export type McpToolDef = {
	/** Namespaced tool name — mcp__<slug>__<originalName> */
	name: string;
	originalName: string;
	description: string;
	inputSchema: Record<string, unknown>;
	serverId: string;
	serverUrl: string;
	serverType: string;
};

function slug(name: string) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function makeClient() {
	return new Client({ name: "localghost", version: "1.0.0" });
}

function makeTransport(url: string, type: string) {
	if (type === "sse") return new SSEClientTransport(new URL(url));
	return new StreamableHTTPClientTransport(new URL(url));
}

/** List all tools exposed by an MCP server; returns [] if connection fails. */
export async function listMcpTools(server: McpServerConfig): Promise<McpToolDef[]> {
	const client = makeClient();
	try {
		const transport = makeTransport(server.url, server.type);
		await client.connect(transport);
		const result = await client.listTools();
		await client.close();
		const serverSlug = slug(server.name);
		return result.tools.map((t) => ({
			name: `mcp__${serverSlug}__${t.name}`,
			originalName: t.name,
			description: t.description ?? "",
			inputSchema: t.inputSchema as Record<string, unknown>,
			serverId: server.id,
			serverUrl: server.url,
			serverType: server.type,
		}));
	} catch {
		await client.close().catch(() => {});
		return [];
	}
}

/** Enumerate tools from multiple servers. Tools from the first server win on name conflict. */
export async function listAllMcpTools(servers: McpServerConfig[]): Promise<McpToolDef[]> {
	const results = await Promise.all(servers.map(listMcpTools));
	const seen = new Set<string>();
	const out: McpToolDef[] = [];
	for (const batch of results) {
		for (const tool of batch) {
			if (!seen.has(tool.name)) {
				seen.add(tool.name);
				out.push(tool);
			}
		}
	}
	return out;
}

/** Call a tool on an MCP server and return its text output. */
export async function callMcpTool(
	tool: McpToolDef,
	args: Record<string, unknown>,
): Promise<string> {
	const client = makeClient();
	const transport = makeTransport(tool.serverUrl, tool.serverType);
	await client.connect(transport);
	try {
		const result = await client.callTool({ name: tool.originalName, arguments: args });
		await client.close();
		const rawContent = result.content;
		const content = Array.isArray(rawContent) ? rawContent : [];
		return content
			.map((c: { type: string; text?: string }) => {
				if (c.type === "text") return c.text ?? "";
				return JSON.stringify(c);
			})
			.join("\n");
	} catch (err) {
		await client.close().catch(() => {});
		throw err;
	}
}
