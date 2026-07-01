import { CheckCircle2Icon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { FitBadge } from "#/features/library/components/ModelTable/FitBadge";
import { formatBytes } from "#/features/library/lib/format";
import type { ModelRow } from "#/features/library/lib/model-rows";
import type { FitScore, OllamaInstalledModel } from "#/features/library/lib/types";

/** Em-dash placeholder shown when a cell has no value. */
export function EmptyCell() {
	return <span className="text-xs text-muted-foreground">—</span>;
}

/** Green check marking a model that is installed locally. */
export function InstalledCheck() {
	return <CheckCircle2Icon size={12} className="shrink-0 text-success" />;
}

/** Name, size, install state, blurb, and capability tags — the primary cell. */
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
			<p className="text-xs text-muted-foreground truncate max-w-xs">
				{catalog?.description || id}
			</p>
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

export function FamilyCell({ family }: { family?: string | null }) {
	return <span className="text-xs text-muted-foreground whitespace-nowrap">{family || "—"}</span>;
}

export function ParamsCell({ row }: { row: ModelRow }) {
	const params =
		row.catalog?.paramB != null ? `${row.catalog.paramB}B` : row.installed?.parameterSize;
	return <span className="text-sm tabular-nums">{params ?? "—"}</span>;
}

/** Estimated memory footprint; `—` when we couldn't parse a parameter count. */
export function MemoryCell({ gb }: { gb: number }) {
	if (gb <= 0) return <EmptyCell />;
	return <span className="text-xs tabular-nums">~{gb} GB</span>;
}

export function SizeCell({ installed }: { installed: OllamaInstalledModel | null }) {
	if (!installed) return <EmptyCell />;
	return (
		<span className="text-xs tabular-nums text-muted-foreground">
			{formatBytes(installed.sizeBytes)}
		</span>
	);
}

export function FitCell({ fit, hasHardware }: { fit: FitScore | null; hasHardware: boolean }) {
	if (!hasHardware || !fit) return <EmptyCell />;
	return <FitBadge tier={fit.tier} overall={fit.overall} />;
}

export function TextCell({ value }: { value: string | undefined }) {
	if (!value) return <EmptyCell />;
	return (
		<span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{value}</span>
	);
}
