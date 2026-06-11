import { useMemo, useState } from "react";
import { DataTable } from "#/components/DataTable";
import {
	createModelColumns,
	type ModelRow,
} from "#/features/cookbook/components/ModelTable/columns";
import {
	type ModelStatusFilter,
	ModelTableToolbar,
} from "#/features/cookbook/components/ModelTable/ModelTableToolbar";
import { CATALOG, computeFit } from "#/features/cookbook/lib/catalog";
import type {
	HardwareInfo,
	OllamaInstalledModel,
	PullProgress,
} from "#/features/cookbook/lib/types";
import { cn } from "#/lib/utils";

type ModelTableProps = {
	hardware: HardwareInfo | undefined;
	installedModels: OllamaInstalledModel[];
	pulling: Record<string, PullProgress>;
	onPull: (model: string) => void;
	onDelete: (model: string) => void;
};

export function ModelTable({
	hardware,
	installedModels,
	pulling,
	onPull,
	onDelete,
}: ModelTableProps) {
	const [globalFilter, setGlobalFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState<ModelStatusFilter>("all");

	const installedByName = useMemo(
		() => new Map(installedModels.map((m) => [m.name, m])),
		[installedModels],
	);

	const rows: ModelRow[] = useMemo(() => {
		return CATALOG.map((model) => ({
			model,
			fit: hardware
				? computeFit(model, hardware)
				: { tier: "too-large", gpuHeadroomPct: null, cpuHeadroomGb: 0, overall: 0 },
			installed: installedByName.get(model.id) ?? null,
		}));
	}, [hardware, installedByName]);

	const filteredRows = useMemo(() => {
		if (statusFilter === "installed") return rows.filter((row) => row.installed);
		if (statusFilter === "available") return rows.filter((row) => !row.installed);
		return rows;
	}, [rows, statusFilter]);

	const columns = useMemo(
		() => createModelColumns({ hasHardware: Boolean(hardware), pulling, onPull, onDelete }),
		[hardware, pulling, onPull, onDelete],
	);

	return (
		<DataTable
			columns={columns}
			data={filteredRows}
			emptyMessage="No models found."
			initialSorting={[{ id: "overall", desc: true }]}
			globalFilter={globalFilter}
			getRowClassName={(row) => cn(row.installed && "bg-success/5")}
			toolbar={(table) => (
				<ModelTableToolbar
					globalFilter={globalFilter}
					onGlobalFilterChange={setGlobalFilter}
					statusFilter={statusFilter}
					onStatusFilterChange={setStatusFilter}
					rowCount={table.getRowCount()}
				/>
			)}
		/>
	);
}
