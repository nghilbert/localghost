import type { VisibilityState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { createModelColumns } from "#/features/pull-model/components/ModelTable/columns";
import {
	type ModelStatusFilter,
	ModelTableToolbar,
} from "#/features/pull-model/components/ModelTable/ModelTableToolbar";
import { buildModelRows } from "#/features/pull-model/lib/model-rows";
import type {
	CatalogModel,
	OllamaInstalledModel,
	PullProgress,
} from "#/features/pull-model/lib/types";
import { DataTable } from "#/shared/components/DataTable";
import { fuzzyFilter } from "#/shared/components/DataTable/fuzzyFilter";
import { cn } from "#/shared/lib/utils";

type ModelTableProps = {
	catalog: CatalogModel[];
	installedModels: OllamaInstalledModel[];
	pulling: Record<string, PullProgress>;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDismiss: (model: string) => void;
	onDelete: (model: string) => void;
	initialColumnVisibility?: VisibilityState;
};

/** The Library's model table: catalog, installed, and in-flight rows in one place. */
export function ModelTable({
	catalog,
	installedModels,
	pulling,
	onPull,
	onStop,
	onDismiss,
	onDelete,
	initialColumnVisibility,
}: ModelTableProps) {
	const [globalFilter, setGlobalFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState<ModelStatusFilter>("all");

	const rows = useMemo(
		() => buildModelRows({ catalog, installedModels, pulling }),
		[catalog, installedModels, pulling],
	);

	const filteredRows = useMemo(() => {
		if (statusFilter === "installed") return rows.filter((row) => row.installed);
		if (statusFilter === "available") return rows.filter((row) => !row.installed);
		return rows;
	}, [rows, statusFilter]);

	const columns = useMemo(
		() => createModelColumns({ onPull, onStop, onDismiss, onDelete }),
		[onPull, onStop, onDismiss, onDelete],
	);

	return (
		<DataTable
			columns={columns}
			data={filteredRows}
			emptyMessage="No models found."
			initialSorting={[{ id: "updated", desc: true }]}
			initialColumnVisibility={initialColumnVisibility}
			pageSize={25}
			globalFilter={globalFilter}
			globalFilterFn={fuzzyFilter}
			getRowClassName={(row) => cn(row.installed && "bg-success/5")}
			toolbar={(table) => (
				<ModelTableToolbar
					table={table}
					globalFilter={globalFilter}
					onGlobalFilterChange={setGlobalFilter}
					statusFilter={statusFilter}
					onStatusFilterChange={setStatusFilter}
				/>
			)}
		/>
	);
}
