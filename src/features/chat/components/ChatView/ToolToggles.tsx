import { BrainIcon, GlobeIcon } from "lucide-react";
import { Toggle } from "#/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";

export type ToolControls = {
	/** Catalog ids the user opted into for the next message (currently just `memory`). */
	enabledTools: string[];
	/** When true, the next message is told to run a web search rather than inferring. */
	forceWebSearch: boolean;
	supportsTools: boolean;
	onEnabledToolsChange: (enabledTools: string[]) => void;
	onForceWebSearchChange: (force: boolean) => void;
};

/**
 * The composer's inline tool toggles, applied to the next message only. Web search
 * is always available to capable models — the globe forces a search this turn
 * rather than letting the model decide. Memory is opt-in. Both reset after sending.
 */
export function ToolToggles({
	enabledTools,
	forceWebSearch,
	supportsTools,
	onEnabledToolsChange,
	onForceWebSearchChange,
}: ToolControls) {
	const memoryOn = enabledTools.includes("memory");

	function toggleMemory(on: boolean) {
		onEnabledToolsChange(
			on ? [...enabledTools, "memory"] : enabledTools.filter((t) => t !== "memory"),
		);
	}

	return (
		<div className="flex items-center gap-1">
			<Tooltip>
				<TooltipTrigger asChild>
					<Toggle
						size="sm"
						variant="outline"
						aria-label="Force web search"
						pressed={forceWebSearch}
						onPressedChange={onForceWebSearchChange}
						disabled={!supportsTools}
					>
						<GlobeIcon />
					</Toggle>
				</TooltipTrigger>
				<TooltipContent>
					{supportsTools
						? "Search the web — off lets the model decide, on forces a search."
						: "This model can't use tools"}
				</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<Toggle
						size="sm"
						variant="outline"
						aria-label="Use memory"
						pressed={memoryOn}
						onPressedChange={toggleMemory}
						disabled={!supportsTools}
					>
						<BrainIcon />
					</Toggle>
				</TooltipTrigger>
				<TooltipContent>
					{supportsTools
						? "Memory — let the model save and recall long-term notes about you."
						: "This model can't use tools"}
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
