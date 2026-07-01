import { BrainIcon, GlobeIcon, type LucideIcon, SlidersHorizontalIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { Switch } from "#/components/ui/switch";

export type ToolControls = {
	/** Catalog ids the user opted into for the next message (currently just `memory`). */
	enabledTools: string[];
	/** When true, the next message is told to run a web search instead of inferring. */
	forceWebSearch: boolean;
	supportsTools: boolean;
	onEnabledToolsChange: (enabledTools: string[]) => void;
	onForceWebSearchChange: (force: boolean) => void;
};

/** One toggleable tool row, resolved from the controls into a uniform shape. */
type ToolRow = {
	id: string;
	label: string;
	description: string;
	icon: LucideIcon;
	on: boolean;
	onChange: (on: boolean) => void;
};

/**
 * Builds the tool rows from the controls. Adding a tool later (MCP, skills) is a new
 * entry here, not a layout change — the menu renders whatever this returns.
 */
export function toolRows(controls: ToolControls): ToolRow[] {
	const { enabledTools, onEnabledToolsChange } = controls;
	return [
		{
			id: "web_search",
			label: "Web search",
			description: "Force the model to do a web search for this message",
			icon: GlobeIcon,
			on: controls.forceWebSearch,
			onChange: controls.onForceWebSearchChange,
		},
		{
			id: "memory",
			label: "Memory",
			description: "Let the model save and recall long-term notes about you.",
			icon: BrainIcon,
			on: enabledTools.includes("memory"),
			onChange: (on) =>
				onEnabledToolsChange(
					on ? [...enabledTools, "memory"] : enabledTools.filter((t) => t !== "memory"),
				),
		},
	];
}

/**
 * Inline per-message tool controls. One button opens a popover of labeled switches;
 * the trigger shows how many are active. Selections apply to the next message only and
 * reset after sending. Disabled wholesale when the model can't use tools.
 */
export function ToolsMenu(controls: ToolControls) {
	const rows = toolRows(controls);
	const activeCount = rows.filter((row) => row.on).length;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5" disabled={!controls.supportsTools}>
					<SlidersHorizontalIcon size={14} />
					Tools
					{controls.supportsTools && activeCount > 0 && (
						<Badge variant="secondary" className="px-1.5 py-0 text-xs tabular-nums">
							{activeCount}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-72 p-1">
				{rows.map((row) => (
					<label
						key={row.id}
						htmlFor={`tool-${row.id}`}
						className="flex cursor-pointer items-start gap-3 rounded-sm p-2 hover:bg-muted"
					>
						<row.icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<div className="text-sm font-medium">{row.label}</div>
							<p className="text-xs text-muted-foreground">{row.description}</p>
						</div>
						<Switch
							id={`tool-${row.id}`}
							checked={row.on}
							onCheckedChange={row.onChange}
							className="mt-0.5"
						/>
					</label>
				))}
			</PopoverContent>
		</Popover>
	);
}
