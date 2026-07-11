import type { Table } from "@tanstack/react-table";
import { MODEL_COLUMN_LABELS } from "#/features/pull-model/components/ModelTable/columns";
import type { ModelRow } from "#/features/pull-model/lib/model-rows";
import { DataTableViewOptions } from "#/shared/components/DataTable/DataTableViewOptions";
import { Input } from "#/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/shared/ui/select";

const STATUS_FILTERS = ["all", "installed", "available"] as const;

export type ModelStatusFilter = (typeof STATUS_FILTERS)[number];

export function isModelStatusFilter(value: string): value is ModelStatusFilter {
	return STATUS_FILTERS.some((filter) => filter === value);
}

type ModelTableToolbarProps = {
	table: Table<ModelRow>;
	globalFilter: string;
	onGlobalFilterChange: (value: string) => void;
	statusFilter: ModelStatusFilter;
	onStatusFilterChange: (value: ModelStatusFilter) => void;
};

export function ModelTableToolbar({
	table,
	globalFilter,
	onGlobalFilterChange,
	statusFilter,
	onStatusFilterChange,
}: ModelTableToolbarProps) {
	return (
		<div className="flex items-center gap-2">
			<Input
				placeholder="Search models…"
				value={globalFilter}
				onChange={(e) => onGlobalFilterChange(e.target.value)}
				className="max-w-xs h-8 text-sm"
			/>
			<Select
				value={statusFilter}
				onValueChange={(value) => {
					if (value && isModelStatusFilter(value)) onStatusFilterChange(value);
				}}
			>
				<SelectTrigger className="h-8 w-36 text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All models</SelectItem>
					<SelectItem value="installed">Installed</SelectItem>
					<SelectItem value="available">Not installed</SelectItem>
				</SelectContent>
			</Select>

			<div className="ml-auto flex items-center gap-2">
				<span className="text-xs text-muted-foreground">
					{table.getRowCount()} model{table.getRowCount() !== 1 ? "s" : ""}
				</span>
				<DataTableViewOptions table={table} labels={MODEL_COLUMN_LABELS} />
			</div>
		</div>
	);
}
