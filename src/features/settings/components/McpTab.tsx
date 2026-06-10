import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircleIcon, TrashIcon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import {
	createMcpServer,
	deleteMcpServer,
	mcpServersQueryOptions,
	testMcpServer,
	updateMcpServer,
} from "#/features/mcp/lib/mcp.functions";
import { cn } from "#/lib/utils";

type McpTestResult = { ok: boolean; tools: { name: string; description: string }[] };

export function McpTab() {
	const queryClient = useQueryClient();
	const { data: servers = [] } = useQuery(mcpServersQueryOptions());
	const [showForm, setShowForm] = useState(false);
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [type, setType] = useState<"streamable-http" | "sse">("streamable-http");
	const [formError, setFormError] = useState<string | null>(null);
	const [testResults, setTestResults] = useState<Record<string, McpTestResult | null>>({});
	const [testingId, setTestingId] = useState<string | null>(null);

	const createMutation = useMutation({
		mutationFn: createMcpServer,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
			setShowForm(false);
			setName("");
			setUrl("");
			setType("streamable-http");
			setFormError(null);
		},
		onError: (e) => setFormError((e as Error).message),
	});

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
				<Button size="sm" onClick={() => setShowForm((p) => !p)}>
					{showForm ? "Cancel" : "Add server"}
				</Button>
			</div>

			{showForm && (
				<Card>
					<CardHeader>
						<CardTitle>New MCP server</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{formError && <p className="text-xs text-destructive">{formError}</p>}
						<Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
						<Input
							placeholder="https://mcp.example.com/mcp"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
						/>
						<div className="flex gap-2">
							{(["streamable-http", "sse"] as const).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setType(t)}
									className={cn(
										"rounded-full border px-3 py-1 text-xs",
										type === t
											? "border-primary bg-primary/10 text-primary"
											: "border-border text-muted-foreground hover:border-primary/50",
									)}
								>
									{t}
								</button>
							))}
						</div>
						<Button
							size="sm"
							disabled={!name.trim() || !url.trim() || createMutation.isPending}
							onClick={() => createMutation.mutate({ data: { name, url, type } })}
						>
							{createMutation.isPending ? "Adding…" : "Add"}
						</Button>
					</CardContent>
				</Card>
			)}

			{servers.length === 0 && !showForm && (
				<p className="text-sm text-muted-foreground">No MCP servers configured.</p>
			)}

			<div className="space-y-2">
				{servers.map((srv) => {
					const result = testResults[srv.id];
					return (
						<Card key={srv.id} size="sm">
							<CardContent className="space-y-2">
								<div className="flex items-center gap-3">
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium">{srv.name}</p>
										<p className="truncate text-xs text-muted-foreground">{srv.url}</p>
										<p className="text-xs text-muted-foreground">{srv.type}</p>
									</div>
									<div className="flex shrink-0 items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											className="h-7 px-2 text-xs"
											onClick={() => handleTest(srv.id)}
											disabled={testingId === srv.id}
										>
											{testingId === srv.id ? "Testing…" : "Test"}
										</Button>
										<button
											type="button"
											onClick={() =>
												toggleMutation.mutate({ data: { id: srv.id, enabled: !srv.enabled } })
											}
											className={cn(
												"rounded px-2 py-0.5 text-xs",
												srv.enabled
													? "bg-primary/10 text-primary"
													: "bg-muted text-muted-foreground",
											)}
										>
											{srv.enabled ? "Enabled" : "Disabled"}
										</button>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 text-destructive hover:text-destructive"
											onClick={() => deleteMutation.mutate({ data: { id: srv.id } })}
											aria-label="Delete MCP server"
										>
											<TrashIcon size={13} />
										</Button>
									</div>
								</div>
								{result !== undefined && result !== null && (
									<div className="rounded bg-muted/50 p-2 text-xs">
										<div className="flex items-center gap-1 font-medium">
											{result.ok ? (
												<CheckCircleIcon size={12} className="text-green-500" />
											) : (
												<XCircleIcon size={12} className="text-destructive" />
											)}
											{result.ok
												? `Connected — ${result.tools.length} tool${result.tools.length === 1 ? "" : "s"}`
												: "Connection failed"}
										</div>
										{result.tools.length > 0 && (
											<ul className="mt-1 space-y-0.5 text-muted-foreground">
												{result.tools.slice(0, 8).map((t) => (
													<li key={t.name}>
														<code>{t.name}</code>
														{t.description && ` — ${t.description}`}
													</li>
												))}
												{result.tools.length > 8 && <li>…and {result.tools.length - 8} more</li>}
											</ul>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
