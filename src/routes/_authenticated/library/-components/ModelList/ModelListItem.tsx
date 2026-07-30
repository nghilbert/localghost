import { CheckCircle2Icon, ChevronRightIcon, GaugeIcon, ImageIcon } from "lucide-react";
import { ModelPullControls } from "#/routes/_authenticated/library/-components/ModelPullControls";
import type { ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import { Badge } from "#/shared/components/ui/badge";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemMedia,
	ItemTitle,
} from "#/shared/components/ui/item";
import { classifyHardwareFit, formatPullCount } from "#/shared/domain/model/hardware-fit";
import type { HardwareInfo } from "#/shared/domain/model/types";
import { cn } from "#/shared/lib/utils";

const FIT_BADGE: Record<"fits" | "tight" | "unknown", { label: string; className?: string }> = {
	fits: { label: "Runs on this machine", className: "text-success" },
	tight: { label: "May be too large" },
	unknown: { label: "Size unknown" },
};

/** The row's descriptive line, from whatever the catalog actually knows — never a raw repo id. */
function specLine(row: ModelRow): string {
	const { catalog, installed } = row;
	const parts: string[] = [];
	const paramB = catalog?.paramB ?? installed?.paramB;
	if (paramB != null) parts.push(`${paramB}B params`);
	if (catalog?.contextK) parts.push(`${catalog.contextK}K context`);
	if (catalog?.license) parts.push(catalog.license);
	const sizeGb = installed?.sizeBytes != null ? installed.sizeBytes / 1e9 : catalog?.sizeGb;
	if (sizeGb != null) parts.push(`${Math.round(sizeGb * 10) / 10} GB`);
	if (catalog?.author && parts.length === 0) parts.push(catalog.author);
	return parts.length > 0 ? parts.join(" · ") : row.name;
}

type ModelListItemProps = {
	row: ModelRow;
	hardware: HardwareInfo | undefined;
	expanded: boolean;
	onToggleExpanded: () => void;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
};

/** One catalog model: identity, a real spec line, hardware fit, and the primary install action. */
export function ModelListItem({
	row,
	hardware,
	expanded,
	onToggleExpanded,
	onPull,
	onStop,
}: ModelListItemProps) {
	const { catalog, installed, pullState } = row;
	const fit = catalog ? classifyHardwareFit({ model: catalog, hardware }) : null;
	const isVision = catalog?.capabilities.includes("vision") ?? installed?.vision;

	return (
		<Item
			variant="outline"
			className={cn("cursor-pointer items-start", installed && "bg-success/5")}
			onClick={onToggleExpanded}
			role="button"
			tabIndex={0}
			aria-expanded={expanded}
			data-testid="model-list-item"
		>
			<ItemMedia variant="icon" className="mt-0.5">
				<ChevronRightIcon
					className={cn("transition-transform", expanded && "rotate-90")}
					data-testid="model-list-expand-toggle"
				/>
			</ItemMedia>
			<ItemContent>
				<ItemTitle>
					{catalog?.displayName || row.name}
					{isVision && <ImageIcon className="size-3.5 text-muted-foreground" />}
					{catalog?.pullCount != null && catalog.pullCount > 0 && (
						<span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
							<GaugeIcon className="size-3" />
							{formatPullCount(catalog.pullCount)}
						</span>
					)}
				</ItemTitle>
				<ItemDescription>{specLine(row)}</ItemDescription>
			</ItemContent>
			<ItemFooter onClick={(event) => event.stopPropagation()}>
				{fit && !installed && (
					<Badge variant="outline" className={FIT_BADGE[fit].className}>
						{FIT_BADGE[fit].label}
					</Badge>
				)}
				{installed ? (
					<Badge variant="secondary">
						<CheckCircle2Icon data-icon="inline-start" />
						Installed
					</Badge>
				) : (
					<ModelPullControls
						modelId={row.id}
						pullState={pullState}
						onPull={onPull}
						onStop={onStop}
					/>
				)}
			</ItemFooter>
		</Item>
	);
}
