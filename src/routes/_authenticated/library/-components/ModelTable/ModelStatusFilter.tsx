import type { Table } from "@tanstack/react-table";
import type { ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import { ToggleGroup, ToggleGroupItem } from "#/shared/components/ui/toggle-group";

const MODEL_STATUSES = ["all", "installed", "available"] as const;

export type ModelStatus = (typeof MODEL_STATUSES)[number];

const STATUS_LABELS: Record<ModelStatus, string> = {
	all: "All",
	installed: "Installed",
	available: "Available",
};

function isModelStatus(value: string): value is ModelStatus {
	return MODEL_STATUSES.some((status) => status === value);
}

/**
 * Segmented control that narrows the model table to installed or
 * not-yet-installed models. Reads and drives the table's own "status" column
 * filter, so its counts are TanStack's real per-column facets — computed
 * after the search box's text filter, not before it.
 */
export function ModelStatusFilter({ table }: { table: Table<ModelRow> }) {
	const column = table.getColumn("status");
	const facets = column?.getFacetedUniqueValues();
	const installed = facets?.get("installed") ?? 0;
	const available = facets?.get("available") ?? 0;
	const counts: Record<ModelStatus, number> = { all: installed + available, installed, available };
	const value = (column?.getFilterValue() as ModelStatus | undefined) ?? "all";

	return (
		<ToggleGroup
			variant="outline"
			spacing={0}
			value={[value]}
			onValueChange={([next]) => {
				if (!next || !isModelStatus(next)) return;
				column?.setFilterValue(next === "all" ? undefined : next);
			}}
		>
			{MODEL_STATUSES.map((status) => (
				<ToggleGroupItem key={status} value={status} data-testid={`model-status-${status}`}>
					{STATUS_LABELS[status]}
					<span className="text-muted-foreground tabular-nums">{counts[status]}</span>
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
