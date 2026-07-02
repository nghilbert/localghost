import type { VisibilityState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "#/components/DataTable";
import { fuzzyFilter } from "#/components/DataTable/fuzzyFilter";
import { createModelColumns } from "#/features/library/components/ModelTable/columns";
import {
	type ModelStatusFilter,
	ModelTableToolbar,
} from "#/features/library/components/ModelTable/ModelTableToolbar";
import { buildModelRows } from "#/features/library/lib/model-rows";
import type {
	CatalogModel,
	HardwareInfo,
	OllamaInstalledModel,
	PullProgress,
} from "#/features/library/lib/types";
import { cn } from "#/lib/utils";

type ModelTableProps = {
	catalog: CatalogModel[];
	hardware: HardwareInfo | undefined;
	installedModels: OllamaInstalledModel[];
	pulling: Record<string, PullProgress>;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
	/** "mine" shows only installed or in-flight models and hides the status select. */
	scope?: "catalog" | "mine";
	initialColumnVisibility?: VisibilityState;
};

/** The single table for both Browse and My Models: same columns, same rows. */
export function ModelTable({
	catalog,
	hardware,
	installedModels,
	pulling,
	onPull,
	onStop,
	onDelete,
	scope = "catalog",
	initialColumnVisibility,
}: ModelTableProps) {
	const [globalFilter, setGlobalFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState<ModelStatusFilter>("all");

	const rows = useMemo(
		() => buildModelRows({ catalog, installedModels, pulling, hardware }),
		[catalog, installedModels, pulling, hardware],
	);

	const filteredRows = useMemo(() => {
		if (scope === "mine") return rows.filter((row) => row.installed || row.pullState);
		if (statusFilter === "installed") return rows.filter((row) => row.installed);
		if (statusFilter === "available") return rows.filter((row) => !row.installed);
		return rows;
	}, [rows, scope, statusFilter]);

	const columns = useMemo(
		() => createModelColumns({ hasHardware: Boolean(hardware), onPull, onStop, onDelete }),
		[hardware, onPull, onStop, onDelete],
	);

	return (
		<DataTable
			columns={columns}
			data={filteredRows}
			emptyMessage="No models found."
			initialSorting={[{ id: "fit", desc: true }]}
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
					statusFilter={scope === "mine" ? undefined : statusFilter}
					onStatusFilterChange={scope === "mine" ? undefined : setStatusFilter}
				/>
			)}
		/>
	);
}
