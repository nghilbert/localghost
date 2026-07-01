import type { Table } from "@tanstack/react-table";
import { DataTableViewOptions } from "#/components/DataTable/DataTableViewOptions";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { MODEL_COLUMN_LABELS } from "#/features/library/components/ModelTable/columns";
import type { ModelRow } from "#/features/library/lib/model-rows";

const STATUS_FILTERS = ["all", "installed", "available"] as const;

export type ModelStatusFilter = (typeof STATUS_FILTERS)[number];

export function isModelStatusFilter(value: string): value is ModelStatusFilter {
	return STATUS_FILTERS.some((filter) => filter === value);
}

type ModelTableToolbarProps = {
	table: Table<ModelRow>;
	globalFilter: string;
	onGlobalFilterChange: (value: string) => void;
	/** Omit to hide the all/installed/available select (e.g. the My Models view). */
	statusFilter?: ModelStatusFilter;
	onStatusFilterChange?: (value: ModelStatusFilter) => void;
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
			{statusFilter && onStatusFilterChange && (
				<Select
					value={statusFilter}
					onValueChange={(value) => {
						if (isModelStatusFilter(value)) onStatusFilterChange(value);
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
			)}
			<div className="ml-auto flex items-center gap-2">
				<span className="text-xs text-muted-foreground">
					{table.getRowCount()} model{table.getRowCount() !== 1 ? "s" : ""}
				</span>
				<DataTableViewOptions table={table} labels={MODEL_COLUMN_LABELS} />
			</div>
		</div>
	);
}
