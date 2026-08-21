import { CheckCircle2Icon, ChevronRightIcon, GaugeIcon, ImageIcon } from "lucide-react";
import { ModelPullControls } from "#/routes/_authenticated/library/-components/ModelPullControls";
import { FIT_LABELS } from "#/routes/_authenticated/library/-lib/fit-filter";
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
import { Skeleton } from "#/shared/components/ui/skeleton";
import { classifyHardwareFit, type HardwareFit } from "#/shared/domain/model/hardware-fit";
import type { HardwareInfo } from "#/shared/domain/model/types";
import { formatBytes, formatCount } from "#/shared/lib/format";
import { cn } from "#/shared/lib/utils";

const FIT_BADGE_CLASS: Partial<Record<HardwareFit, string>> = {
	fits: "text-success",
	"wont-fit": "text-destructive",
};

/** The row's descriptive line, from whatever the catalog actually knows — never a raw repo id. */
function specLine(row: ModelRow): string {
	const { catalog, installed } = row;
	const parts: string[] = [];
	const paramB = catalog?.paramB ?? installed?.paramB;
	if (paramB != null) parts.push(`${formatCount(paramB * 1e9)} params`);
	if (catalog?.contextK) parts.push(`${catalog.contextK}K context`);
	if (catalog?.license) parts.push(catalog.license);
	const sizeGb = installed?.sizeBytes != null ? installed.sizeBytes / 1e9 : catalog?.sizeGb;
	if (sizeGb != null) parts.push(formatBytes(sizeGb * 1e9));
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

/**
 * One catalog model row, or its loading placeholder when `isLoading` is true.
 *
 * Both states share this single render tree — only leaf values (media icon, title,
 * description, footer controls) branch on `loaded`, never the surrounding
 * `Item`/`ItemMedia`/`ItemContent`/`ItemFooter` structure — so the loading and loaded
 * shapes can never drift apart.
 */
export function ModelListItem(props: ModelListItemProps) {
	const loaded = props.isLoading ? null : props;

	const catalog = loaded?.row.catalog;
	const installed = loaded?.row.installed;
	const fit =
		loaded && catalog ? classifyHardwareFit({ model: catalog, hardware: loaded.hardware }) : null;
	const isVision = catalog?.capabilities.includes("vision") ?? installed?.vision;

	return (
		<Item
			variant="outline"
			className={cn(
				"items-start",
				loaded && "cursor-pointer",
				installed && "bg-success/5",
				loaded?.expanded && "border-primary/40 bg-muted",
			)}
			onClick={loaded?.onToggleExpanded}
			role={loaded ? "button" : undefined}
			tabIndex={loaded ? 0 : undefined}
			aria-expanded={loaded?.expanded}
			data-testid={loaded ? "model-list-item" : "model-list-item-skeleton"}
		>
			<ItemMedia variant="icon" className="mt-0.5">
				{loaded ? (
					<ChevronRightIcon
						className={cn("transition-transform", loaded.expanded && "rotate-90")}
						data-testid="model-list-expand-toggle"
					/>
				) : (
					<Skeleton className="size-4 rounded-sm" />
				)}
			</ItemMedia>
			<ItemContent>
				<ItemTitle>
					{loaded ? (
						<>
							{catalog?.displayName || loaded.row.name}
							{isVision && <ImageIcon className="size-3.5 text-muted-foreground" />}
							{catalog?.pullCount != null && catalog.pullCount > 0 && (
								<span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
									<GaugeIcon className="size-3" />
									{formatCount(catalog.pullCount)}
								</span>
							)}
						</>
					) : (
						<Skeleton className="h-4 w-40" />
					)}
				</ItemTitle>
				<ItemDescription>
					{loaded ? specLine(loaded.row) : <Skeleton inline className="h-3.5 w-56" />}
				</ItemDescription>
			</ItemContent>
			<ItemFooter
				className="justify-end"
				onClick={loaded ? (event) => event.stopPropagation() : undefined}
			>
				{loaded ? (
					<>
						{fit && !installed && (
							<Badge variant="outline" className={FIT_BADGE_CLASS[fit]}>
								{FIT_LABELS[fit]}
							</Badge>
						)}
						{installed ? (
							<Badge variant="secondary">
								<CheckCircle2Icon data-icon="inline-start" />
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
			</ItemFooter>
		</Item>
	);
}
