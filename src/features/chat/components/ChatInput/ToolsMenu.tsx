import { type LucideIcon, SlidersHorizontalIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Item } from "#/components/ui/item";
import { Popover } from "#/components/ui/popover";
import { Switch } from "#/components/ui/switch";
import { Tooltip } from "#/components/ui/tooltip";
import type { ToolControls } from "#/features/chat/chat.types";
import { TOOL_CATALOG } from "#/features/chat/lib/tool-catalog";

/** One tool's row in the menu. */
type ToolRow = {
	id: string;
	label: string;
	description: string;
	icon: LucideIcon;
	on: boolean;
	onChange: (on: boolean) => void;
};

/** One row per tool in the catalog, each toggling its id in `enabledTools`. */
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
 * A button that opens the tool switches for the next message and shows how many are on.
 * Disabled when the model cannot use tools.
 */
export function ToolsMenu(controls: ToolControls) {
	const rows = toolRows(controls);
	const activeCount = rows.filter((row) => row.on).length;

	if (!controls.supportsTools) {
		return (
			<Tooltip.Root>
				{/* aria-disabled, since `disabled` would grey out the whole input group. */}
				<Tooltip.Trigger render={<span className="cursor-not-allowed" />}>
					<Button
						color="neutral"
						variant="outlined"
						size="sm"
						className="pointer-events-none opacity-50"
						aria-disabled
						tabIndex={-1}
					>
						<SlidersHorizontalIcon />
						Tools
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>This model doesn't support tools.</Tooltip.Content>
			</Tooltip.Root>
		);
	}

	return (
		<Popover.Root>
			<Popover.Trigger render={<Button color="neutral" variant="outlined" size="sm" />}>
				<SlidersHorizontalIcon />
				Tools
				{activeCount > 0 && <Badge className="px-1.5 py-0 tabular-nums">{activeCount}</Badge>}
			</Popover.Trigger>
			<Popover.Content align="start" className="gap-0 p-1">
				{rows.map((row) => (
					<Item.Root
						key={row.id}
						render={<label htmlFor={`tool-${row.id}`} aria-label={row.label} />}
						size="sm"
						className="cursor-pointer flex-nowrap items-start hover:bg-muted"
					>
						<Item.Media media="icon" className="mt-0.5 text-muted-fg">
							<row.icon />
						</Item.Media>
						<Item.Content className="min-w-0 gap-0">
							<Item.Title>{row.label}</Item.Title>
							<Item.Description className="text-xs">{row.description}</Item.Description>
						</Item.Content>
						<Switch
							id={`tool-${row.id}`}
							checked={row.on}
							onCheckedChange={row.onChange}
							className="mt-0.5"
						/>
					</Item.Root>
				))}
			</Popover.Content>
		</Popover.Root>
	);
}
