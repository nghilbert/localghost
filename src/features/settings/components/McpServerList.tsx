import { CheckCircleIcon, TrashIcon, XCircleIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/components/ui/item";
import type { McpServerModel } from "#/generated/prisma/models";
import { cn } from "#/lib/utils";

export type McpTestResult = { ok: boolean; tools: { name: string; description: string }[] };

type McpServerListProps = {
	servers: McpServerModel[];
	testResults: Record<string, McpTestResult | null>;
	testingId: string | null;
	onTest: (id: string) => void;
	onToggle: (server: McpServerModel) => void;
	onDelete: (id: string) => void;
};

export function McpServerList({
	servers,
	testResults,
	testingId,
	onTest,
	onToggle,
	onDelete,
}: McpServerListProps) {
	return (
		<ItemGroup>
			{servers.map((server) => {
				const result = testResults[server.id];
				return (
					<Item key={server.id} variant="outline" className="flex-col items-start gap-2">
						<div className="flex w-full items-center gap-3">
							<ItemContent>
								<ItemTitle>{server.name}</ItemTitle>
								<ItemDescription className="truncate">{server.url}</ItemDescription>
								<ItemDescription>{server.type}</ItemDescription>
							</ItemContent>
							<ItemActions>
								<Button
									variant="outline"
									size="sm"
									className="h-7 px-2 text-xs"
									onClick={() => onTest(server.id)}
									disabled={testingId === server.id}
								>
									{testingId === server.id ? "Testing…" : "Test"}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className={cn(
										"h-7 px-2 text-xs",
										server.enabled
											? "bg-primary/10 text-primary hover:bg-primary/20"
											: "bg-muted text-muted-foreground",
									)}
									onClick={() => onToggle(server)}
								>
									{server.enabled ? "Enabled" : "Disabled"}
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 text-destructive hover:text-destructive"
									onClick={() => onDelete(server.id)}
									aria-label="Delete MCP server"
								>
									<TrashIcon size={13} />
								</Button>
							</ItemActions>
						</div>
						{result !== undefined && result !== null && (
							<div className="w-full rounded bg-muted/50 p-2 text-xs">
								<div className="flex items-center gap-1 font-medium">
									{result.ok ? (
										<CheckCircleIcon size={12} className="text-success" />
									) : (
										<XCircleIcon size={12} className="text-destructive" />
									)}
									{result.ok
										? `Connected — ${result.tools.length} tool${result.tools.length === 1 ? "" : "s"}`
										: "Connection failed"}
								</div>
								{result.tools.length > 0 && (
									<ul className="mt-1 space-y-0.5 text-muted-foreground">
										{result.tools.slice(0, 8).map((tool) => (
											<li key={tool.name}>
												<code>{tool.name}</code>
												{tool.description && ` — ${tool.description}`}
											</li>
										))}
										{result.tools.length > 8 && <li>…and {result.tools.length - 8} more</li>}
									</ul>
								)}
							</div>
						)}
					</Item>
				);
			})}
		</ItemGroup>
	);
}
