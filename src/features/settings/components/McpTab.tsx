import { useState } from "react";
import { Button } from "#/components/ui/button";
import { useMcpServers } from "#/features/mcp/hooks/use-mcp-servers";
import { AddMcpServerForm } from "#/features/settings/components/AddMcpServerForm";
import { McpServerList, type McpTestResult } from "#/features/settings/components/McpServerList";

export function McpTab() {
	const { servers, updateServer, deleteServer, testServer } = useMcpServers();
	const [showForm, setShowForm] = useState(false);
	const [testResults, setTestResults] = useState<Record<string, McpTestResult | null>>({});
	const [testingId, setTestingId] = useState<string | null>(null);

	async function handleTest(id: string) {
		setTestingId(id);
		setTestResults((prev) => ({ ...prev, [id]: null }));
		try {
			const res = await testServer.mutateAsync(id);
			setTestResults((prev) => ({ ...prev, [id]: res }));
		} catch {
			setTestResults((prev) => ({ ...prev, [id]: { ok: false, tools: [] } }));
		} finally {
			setTestingId(null);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Connect external MCP servers to expose their tools to the agent.
				</p>
				<Button size="sm" onClick={() => setShowForm((isShown) => !isShown)}>
					{showForm ? "Cancel" : "Add server"}
				</Button>
			</div>

			{showForm && <AddMcpServerForm onSuccess={() => setShowForm(false)} />}

			{servers.length === 0 && !showForm && (
				<p className="text-sm text-muted-foreground">No MCP servers configured.</p>
			)}

			{servers.length > 0 && (
				<McpServerList
					servers={servers}
					testResults={testResults}
					testingId={testingId}
					onTest={handleTest}
					onToggle={(server) => updateServer.mutate({ id: server.id, enabled: !server.enabled })}
					onDelete={(id) => deleteServer.mutate(id)}
				/>
			)}
		</div>
	);
}
