import { useQuery } from "@tanstack/react-query";
import { WrenchIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { mcpServersQueryOptions } from "#/features/mcp/lib/mcp.functions";
import { MCP_TOOL_PREFIX, TOOL_CATALOG } from "#/lib/tools/catalog";

type Props = {
	enabledTools: string[];
	supportsTools: boolean;
	onChange: (enabledTools: string[]) => void;
};

/**
 * Inline, ephemeral tool selector for a single send: built-in catalog tools plus
 * the user's enabled MCP servers (`mcp:<id>`). The selection lives in component
 * state and rides along each message via `forwardedProps` — it is never persisted.
 * Disabled when the selected model can't use tools.
 */
export function ToolsPicker({ enabledTools, supportsTools, onChange }: Props) {
	const { data: servers = [] } = useQuery(mcpServersQueryOptions());
	const mcpServers = servers.filter((server) => server.enabled);

	function toggle(id: string, checked: boolean) {
		onChange(checked ? [...enabledTools, id] : enabledTools.filter((tool) => tool !== id));
	}

	if (!supportsTools) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span>
						<Button variant="outline" size="sm" disabled className="h-8 gap-1.5 rounded-full">
							<WrenchIcon size={14} />
							Tools
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>This model can't use tools</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full">
					<WrenchIcon size={14} />
					Tools{enabledTools.length > 0 ? ` · ${enabledTools.length}` : ""}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				<DropdownMenuLabel>Tools</DropdownMenuLabel>
				{TOOL_CATALOG.map((tool) => (
					<DropdownMenuCheckboxItem
						key={tool.id}
						checked={enabledTools.includes(tool.id)}
						onCheckedChange={(checked) => toggle(tool.id, checked)}
						onSelect={(e) => e.preventDefault()}
					>
						{tool.label}
					</DropdownMenuCheckboxItem>
				))}
				{mcpServers.length > 0 && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>MCP servers</DropdownMenuLabel>
						{mcpServers.map((server) => {
							const id = `${MCP_TOOL_PREFIX}${server.id}`;
							return (
								<DropdownMenuCheckboxItem
									key={server.id}
									checked={enabledTools.includes(id)}
									onCheckedChange={(checked) => toggle(id, checked)}
									onSelect={(e) => e.preventDefault()}
								>
									{server.name}
								</DropdownMenuCheckboxItem>
							);
						})}
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
