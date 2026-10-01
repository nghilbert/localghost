import { CheckCircle2Icon, ChevronRightIcon, GaugeIcon, ImageIcon } from "lucide-react";
import { cn } from "tailwind-variants";
import { StatusBadge } from "#/components/layout/StatusBadge";
import { Badge } from "#/components/ui/badge";
import { Item } from "#/components/ui/item";
import { Skeleton } from "#/components/ui/skeleton";
import { ModelPullControls } from "#/features/library/components/ModelPullControls";
import {
	classifyHardwareFit,
	FIT_LABELS,
	FIT_TONES,
	requiredMemoryGb,
} from "#/features/library/lib/hardware-fit";
import type { ModelRow } from "#/features/library/lib/model-rows";
import type { HardwareInfo } from "#/features/library/library.types";
import { BILLION, formatBytes, formatCount, GIB } from "#/lib/format";

/** A one-line summary from what the catalog knows. */
function specLine(row: ModelRow): string {
	const { catalog, installed } = row;
	const parts: string[] = [];
	const paramB = catalog?.paramB ?? installed?.paramB;
	if (paramB != null) parts.push(`${formatCount(paramB * BILLION)} params`);
	if (catalog?.contextK) parts.push(`${catalog.contextK}K context`);
	if (catalog?.license) parts.push(catalog.license);
	const sizeBytes = installed?.sizeBytes ?? (catalog?.sizeGb != null ? catalog.sizeGb * GIB : null);
	if (sizeBytes != null) parts.push(formatBytes(sizeBytes));
	if (catalog?.author && parts.length === 0) parts.push(catalog.author);
	return parts.length > 0 ? parts.join(" · ") : row.name;
}

type ModelListItemLoadedProps = {
	isLoading?: false;
	row: ModelRow;
	hardware: HardwareInfo | undefined;
	expanded: boolean;
	onToggleExpanded: () => void;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
};

type ModelListItemProps = { isLoading: true } | ModelListItemLoadedProps;

/** A catalog model's row, or its placeholder while loading. Both share one layout. */
export function ModelListItem(props: ModelListItemProps) {
	const loaded = props.isLoading ? null : props;

	const catalog = loaded?.row.catalog;
	const installed = loaded?.row.installed;
	const fit =
		loaded && catalog
			? classifyHardwareFit({ requiredGb: requiredMemoryGb(catalog), hardware: loaded.hardware })
			: null;
	const isVision = catalog?.capabilities.includes("vision") ?? installed?.vision;

	return (
		<Item.Root
			variant="outlined"
			className={cn(
				"relative items-start",
				installed && "bg-success/5",
				loaded?.expanded && "bg-muted ring-primary/40",
			)}
		>
			<Item.Media media="icon" className="mt-0.5">
				{loaded ? (
					<ChevronRightIcon
						className={cn("transition-transform", loaded.expanded && "rotate-90")}
					/>
				) : (
					<Skeleton className="size-4 rounded-sm" />
				)}
			</Item.Media>
			<Item.Content>
				<Item.Title
					render={
						loaded ? (
							// The ::after stretches the button over the whole row, so the row is the click target.
							<button
								type="button"
								aria-expanded={loaded.expanded}
								onClick={loaded.onToggleExpanded}
								className="text-left outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
							/>
						) : undefined
					}
				>
					{loaded ? (
						<>
							{catalog?.displayName || loaded.row.name}
							{isVision && <ImageIcon className="size-3.5 text-muted-fg" />}
							{catalog?.pullCount != null && catalog.pullCount > 0 && (
								<span className="flex items-center gap-1 text-xs font-normal text-muted-fg">
									<GaugeIcon className="size-3" />
									{formatCount(catalog.pullCount)}
								</span>
							)}
						</>
					) : (
						<Skeleton className="h-4 w-40" />
					)}
				</Item.Title>
				<Item.Description>
					{loaded ? (
						specLine(loaded.row)
					) : (
						<Skeleton render={<span />} className="inline-block h-3.5 w-56" />
					)}
				</Item.Description>
			</Item.Content>
			<Item.Footer className="relative justify-end">
				{loaded ? (
					<>
						{fit && !installed && !loaded.row.pullState && (
							<StatusBadge tone={FIT_TONES[fit]}>{FIT_LABELS[fit]}</StatusBadge>
						)}
						{installed ? (
							<Badge>
								<CheckCircle2Icon />
								Installed
							</Badge>
						) : (
							<ModelPullControls
								modelId={loaded.row.id}
								pullState={loaded.row.pullState}
								onPull={loaded.onPull}
								onStop={loaded.onStop}
							/>
						)}
					</>
				) : (
					<>
						<Skeleton className="h-5 w-32 rounded-full" />
						<Skeleton className="h-8 w-24" />
					</>
				)}
			</Item.Footer>
		</Item.Root>
	);
}
