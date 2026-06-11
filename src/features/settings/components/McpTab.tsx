import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	deleteMcpServer,
	mcpServersQueryOptions,
	testMcpServer,
	updateMcpServer,
} from "#/features/mcp/lib/mcp.functions";
import { McpAddServerForm } from "#/features/settings/components/McpAddServerForm";
import { McpServerList, type McpTestResult } from "#/features/settings/components/McpServerList";

export function McpTab() {
	const queryClient = useQueryClient();
	const { data: servers = [] } = useQuery(mcpServersQueryOptions());
	const [showForm, setShowForm] = useState(false);
	const [testResults, setTestResults] = useState<Record<string, McpTestResult | null>>({});
	const [testingId, setTestingId] = useState<string | null>(null);

	const toggleMutation = useMutation({
		mutationFn: updateMcpServer,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcp-servers"] }),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteMcpServer,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcp-servers"] }),
	});

	async function handleTest(id: string) {
		setTestingId(id);
		setTestResults((prev) => ({ ...prev, [id]: null }));
		try {
			const res = await testMcpServer({ data: { id } });
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

			{showForm && <McpAddServerForm onCreated={() => setShowForm(false)} />}

			{servers.length === 0 && !showForm && (
				<p className="text-sm text-muted-foreground">No MCP servers configured.</p>
			)}

			{servers.length > 0 && (
				<McpServerList
					servers={servers}
					testResults={testResults}
					testingId={testingId}
					onTest={handleTest}
					onToggle={(server) =>
						toggleMutation.mutate({ data: { id: server.id, enabled: !server.enabled } })
					}
					onDelete={(id) => deleteMutation.mutate({ data: { id } })}
				/>
			)}
		</div>
	);
}
