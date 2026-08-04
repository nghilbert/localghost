import { type LucideIcon, SlidersHorizontalIcon } from "lucide-react";
import { TOOL_CATALOG } from "#/routes/_authenticated/_chat/-lib/tool-catalog";
import { Badge } from "#/shared/components/ui/badge";
import { Button } from "#/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "#/shared/components/ui/popover";
import { Switch } from "#/shared/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/shared/components/ui/tooltip";

export type ToolControls = {
	/** Catalog ids the user opted into for the next message. */
	enabledTools: string[];
	supportsTools: boolean;
	onEnabledToolsChange: (enabledTools: string[]) => void;
};

/** One toggleable tool row, resolved from the catalog into a uniform shape. */
type ToolRow = {
	id: string;
	label: string;
	description: string;
	icon: LucideIcon;
	on: boolean;
	onChange: (on: boolean) => void;
};

/**
 * Builds one switch row per catalog tool, each toggling its id in
 * `enabledTools`. Adding a tool later is a catalog entry plus an icon here.
 */
export function toolRows(controls: ToolControls): ToolRow[] {
	const { enabledTools, onEnabledToolsChange } = controls;
	return TOOL_CATALOG.map((tool) => ({
		...tool,
		on: enabledTools.includes(tool.id),
		onChange: (on) =>
			onEnabledToolsChange(
				on ? [...enabledTools, tool.id] : enabledTools.filter((t) => t !== tool.id),
			),
	}));
}

/**
 * Inline per-message tool controls. One button opens a popover of labeled switches;
 * the trigger shows how many are active. Selections apply to the next message only,
 * resetting to the defaults after sending. Disabled wholesale when the model can't
 * use tools.
 */
export function ToolsMenu(controls: ToolControls) {
	const rows = toolRows(controls);
	const activeCount = rows.filter((row) => row.on).length;

	if (!controls.supportsTools) {
		return (
			<Tooltip>
				{/* Not natively disabled: that would trip InputGroup's has-disabled
				    styling and grey out the whole chat input. */}
				<TooltipTrigger render={<span className="cursor-not-allowed" />}>
					<Button
						variant="outline"
						size="sm"
						className="pointer-events-none gap-1.5 opacity-50"
						aria-disabled
						tabIndex={-1}
					>
						<SlidersHorizontalIcon size={14} />
						Tools
					</Button>
				</TooltipTrigger>
				<TooltipContent>This model doesn't support tools.</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<Popover>
			<PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
				<SlidersHorizontalIcon size={14} />
				Tools
				{activeCount > 0 && (
					<Badge variant="secondary" className="px-1.5 py-0 text-xs tabular-nums">
						{activeCount}
					</Badge>
				)}
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
