import type { VisibilityState } from "@tanstack/react-table";
import { useMemo } from "react";
import { buildModelRows } from "#/routes/_authenticated/library/-lib/model-rows";
import { DataTable } from "#/shared/components/DataTable";
import type {
	CatalogModel,
	HardwareInfo,
	InstalledModel,
	PullProgress,
} from "#/shared/domain/model/types";
import { cn } from "#/shared/lib/utils";
import { createModelColumns, MODEL_COLUMN_LABELS } from "./columns";
import { ModelDetailPanel } from "./ModelDetailPanel";
import { ModelStatusFilter } from "./ModelStatusFilter";

type ModelTableProps = {
	catalog: CatalogModel[];
	installedModels: InstalledModel[];
	pulling: Record<string, PullProgress>;
	hardware: HardwareInfo | undefined;
	/** The local llama.cpp endpoint's id, for the expanded row's per-model settings. */
	endpointId: string;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
	initialColumnVisibility?: VisibilityState;
};

/** The Library's model table: catalog, installed, and in-flight rows in one place. */
export function ModelTable({
	catalog,
	installedModels,
	pulling,
	hardware,
	endpointId,
	onPull,
	onStop,
	onDelete,
	initialColumnVisibility,
}: ModelTableProps) {
	const rows = useMemo(
		() => buildModelRows({ catalog, installedModels, pulling }),
		[catalog, installedModels, pulling],
	);

	const columns = useMemo(() => createModelColumns(), []);

	return (
		<DataTable
			columns={columns}
			data={rows}
			getRowId={(row) => row.id}
			emptyMessage="No models found."
			initialSorting={[{ id: "updated", desc: true }]}
			initialColumnVisibility={{ status: false, ...initialColumnVisibility }}
			columnLabels={MODEL_COLUMN_LABELS}
			pageSize={25}
			searchPlaceholder="Search models…"
			filters={(table) => <ModelStatusFilter table={table} />}
			getRowClassName={(row) => cn(row.installed && "bg-success/5")}
			renderDetail={(row) => (
				<ModelDetailPanel
					row={row}
					hardware={hardware}
					pulling={pulling}
					endpointId={endpointId}
					onPull={onPull}
					onStop={onStop}
					onDelete={onDelete}
				/>
			)}
		/>
	);
}
