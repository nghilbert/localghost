import type { VisibilityState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { buildModelRows } from "#/routes/_authenticated/library/-lib/model-rows";
import { DataTable } from "#/shared/components/DataTable";
import type {
	CatalogModel,
	HardwareInfo,
	OllamaInstalledModel,
	PullProgress,
} from "#/shared/domain/model/types";
import { cn } from "#/shared/lib/utils";
import { createModelColumns, MODEL_COLUMN_LABELS } from "./columns";
import { ModelDetailPanel } from "./ModelDetailPanel";
import { type ModelStatus, ModelStatusFilter } from "./ModelStatusFilter";

type ModelTableProps = {
	catalog: CatalogModel[];
	installedModels: OllamaInstalledModel[];
	pulling: Record<string, PullProgress>;
	hardware: HardwareInfo | undefined;
	/** The local Ollama endpoint's id, for the expanded row's per-model settings. */
	endpointId: string;
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
	hardware,
	endpointId,
	onPull,
	onStop,
	onDismiss,
	onDelete,
	initialColumnVisibility,
}: ModelTableProps) {
	const [status, setStatus] = useState<ModelStatus>("all");

	const rows = useMemo(
		() => buildModelRows({ catalog, installedModels, pulling }),
		[catalog, installedModels, pulling],
	);

	const counts = useMemo(() => {
		const installed = rows.filter((row) => row.installed).length;
		return { all: rows.length, installed, available: rows.length - installed };
	}, [rows]);

	const filteredRows = useMemo(() => {
		if (status === "installed") return rows.filter((row) => row.installed);
		if (status === "available") return rows.filter((row) => !row.installed);
		return rows;
	}, [rows, status]);

	const columns = useMemo(() => createModelColumns(), []);

	return (
		<DataTable
			columns={columns}
			data={filteredRows}
			getRowId={(row) => row.id}
			emptyMessage="No models found."
			initialSorting={[{ id: "updated", desc: true }]}
			initialColumnVisibility={initialColumnVisibility}
			columnLabels={MODEL_COLUMN_LABELS}
			pageSize={25}
			searchPlaceholder="Search models…"
			filters={<ModelStatusFilter value={status} onValueChange={setStatus} counts={counts} />}
			getRowClassName={(row) => cn(row.installed && "bg-success/5")}
			renderDetail={(row) => (
				<ModelDetailPanel
					row={row}
					hardware={hardware}
					pulling={pulling}
					endpointId={endpointId}
					onPull={onPull}
					onStop={onStop}
					onDismiss={onDismiss}
					onDelete={onDelete}
				/>
			)}
		/>
	);
}
