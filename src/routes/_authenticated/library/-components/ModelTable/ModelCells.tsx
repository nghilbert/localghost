import { CheckCircle2Icon } from "lucide-react";
import type { ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import { Badge } from "#/shared/components/ui/badge";
import { Spinner } from "#/shared/components/ui/spinner";
import { formatBytes } from "#/shared/domain/model/pull-format";

/** Em-dash placeholder shown when a cell has no value. */
export function EmptyCell() {
	return <span className="text-muted-foreground">—</span>;
}

/** The primary cell: model identity, description, and current local status. */
export function ModelIdentityCell({ row }: { row: ModelRow }) {
	const { id, name, catalog, installed, pullState } = row;

	return (
		<div className="min-w-0">
			<div className="flex items-center gap-1.5">
				<span className="font-medium">{name}</span>
				{catalog?.paramB != null && (
					<span className="text-muted-foreground">{catalog.paramB}B</span>
				)}
				{pullState ? (
					<Badge variant="secondary">
						<Spinner className="size-3" />
						Downloading
					</Badge>
				) : installed ? (
					<Badge variant="secondary">
						<CheckCircle2Icon data-icon="inline-start" />
						Installed
					</Badge>
				) : null}
			</div>
			<p className="max-w-xs truncate text-xs text-muted-foreground">
				{catalog?.description || id}
			</p>
		</div>
	);
}

export function ParamsCell({ row }: { row: ModelRow }) {
	const paramB = row.catalog?.paramB ?? row.installed?.paramB;
	return <span className="tabular-nums">{paramB != null ? `${paramB}B` : "—"}</span>;
}

/** Estimated memory needed to run the model; empty when its size is unknown. */
export function MemoryCell({ gb }: { gb: number | null }) {
	if (gb === null || gb <= 0) return <EmptyCell />;
	return <span className="tabular-nums">~{gb} GB</span>;
}

/** Download size: the installed blob's exact size when known, else the catalog's size. */
export function SizeCell({ row }: { row: ModelRow }) {
	const label =
		row.installed?.sizeBytes != null
			? formatBytes(row.installed.sizeBytes)
			: row.catalog?.sizeGb != null
				? `${row.catalog.sizeGb} GB`
				: null;
	if (!label) return <EmptyCell />;
	return <span className="tabular-nums text-muted-foreground">{label}</span>;
}

export function TextCell({ value }: { value: string | undefined }) {
	if (!value) return <EmptyCell />;
	return <span className="tabular-nums text-muted-foreground">{value}</span>;
}
