import { CheckCircle2Icon } from "lucide-react";
import { formatBytes } from "#/features/pull-model/lib/format";
import type { ModelRow } from "#/features/pull-model/lib/model-rows";
import { Badge } from "#/shared/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/shared/ui/tooltip";

/** Em-dash placeholder shown when a cell has no value. */
export function EmptyCell() {
	return <span className="text-xs text-muted-foreground">—</span>;
}

/** Green check marking a model that is installed locally. */
export function InstalledCheck() {
	return <CheckCircle2Icon size={12} className="shrink-0 text-success" />;
}

/** The primary cell: name, size, install state, blurb, and capability tags. */
export function ModelIdentityCell({ row }: { row: ModelRow }) {
	const { id, name, catalog, installed, pullState } = row;
	return (
		<div className="min-w-0">
			<div className="flex items-center gap-1.5">
				<span className="font-medium text-sm">{name}</span>
				{catalog?.paramB != null && (
					<span className="text-xs text-muted-foreground">{catalog.paramB}B</span>
				)}
				{installed && !pullState && <InstalledCheck />}
				{pullState && !pullState.error && (
					<span className="text-xs text-muted-foreground">installing</span>
				)}
			</div>
			<Tooltip>
				<TooltipTrigger>
					<p className="text-xs text-muted-foreground truncate max-w-xs">
						{catalog?.description || id}
					</p>
				</TooltipTrigger>
				<TooltipContent side="right">{catalog?.description || id}</TooltipContent>
			</Tooltip>
			{catalog && catalog.tags.length > 0 && (
				<div className="mt-1 flex flex-wrap gap-0.5">
					{catalog.tags.map((tag) => (
						<Badge key={tag} variant="secondary" className="text-xs px-1 py-0 h-auto">
							{tag}
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}

export function ParamsCell({ row }: { row: ModelRow }) {
	const params =
		row.catalog?.paramB != null ? `${row.catalog.paramB}B` : row.installed?.parameterSize;
	return <span className="text-sm tabular-nums">{params ?? "—"}</span>;
}

/** Estimated memory needed to run the model; empty when its size is unknown. */
export function MemoryCell({ gb }: { gb: number | null }) {
	if (gb === null || gb <= 0) return <EmptyCell />;
	return <span className="text-xs tabular-nums">~{gb} GB</span>;
}

/** Download size: the installed blob when present, else the catalog's tags-page size. */
export function SizeCell({ row }: { row: ModelRow }) {
	const label = row.installed
		? formatBytes(row.installed.sizeBytes)
		: row.catalog?.sizeGb != null
			? `${row.catalog.sizeGb} GB`
			: null;
	if (!label) return <EmptyCell />;
	return <span className="text-xs tabular-nums text-muted-foreground">{label}</span>;
}

export function TextCell({ value }: { value: string | undefined }) {
	if (!value) return <EmptyCell />;
	return (
		<span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{value}</span>
	);
}
