import { useMemo, useState } from "react";
import { DataTable } from "#/components/DataTable";
import { fuzzyFilter } from "#/components/DataTable/fuzzyFilter";
import {
	createMyModelColumns,
	type MyModelRow,
} from "#/features/library/components/MyModelTable/columns";
import { MyModelTableToolbar } from "#/features/library/components/MyModelTable/MyModelTableToolbar";
import { CATALOG, computeFit } from "#/features/library/lib/catalog";
import type {
	CatalogModel,
	HardwareInfo,
	OllamaInstalledModel,
	PullProgress,
} from "#/features/library/lib/types";

type MyModelTableProps = {
	hardware: HardwareInfo | undefined;
	installedModels: OllamaInstalledModel[];
	pulling: Record<string, PullProgress>;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
};

/**
 * Builds the My Models rows from the user's actual state — installed Ollama
 * models unioned with in-flight pulls — rather than the curated catalog. Each row
 * is enriched with catalog metadata (and a hardware fit score) when its id matches
 * a catalog entry, so off-catalog installs still appear with their Ollama-reported
 * details.
 */
export function buildMyModelRows(
	installedModels: OllamaInstalledModel[],
	pulling: Record<string, PullProgress>,
	catalogById: Map<string, CatalogModel>,
	hardware: HardwareInfo | undefined,
): MyModelRow[] {
	const installedByName = new Map(installedModels.map((m) => [m.name, m]));
	const ids = new Set([...installedByName.keys(), ...Object.keys(pulling)]);

	return [...ids].map((id) => {
		const catalog = catalogById.get(id) ?? null;
		return {
			id,
			name: catalog?.name ?? id,
			catalog,
			fit: catalog && hardware ? computeFit({ model: catalog, hw: hardware }) : null,
			installed: installedByName.get(id) ?? null,
			pullState: pulling[id],
		};
	});
}

export function MyModelTable({
	hardware,
	installedModels,
	pulling,
	onStop,
	onDelete,
}: MyModelTableProps) {
	const [globalFilter, setGlobalFilter] = useState("");

	const catalogById = useMemo(() => new Map(CATALOG.map((model) => [model.id, model])), []);

	const rows = useMemo(
		() => buildMyModelRows(installedModels, pulling, catalogById, hardware),
		[installedModels, pulling, catalogById, hardware],
	);

	const columns = useMemo(
		() => createMyModelColumns({ hasHardware: Boolean(hardware), onStop, onDelete }),
		[hardware, onStop, onDelete],
	);

	return (
		<DataTable
			columns={columns}
			data={rows}
			emptyMessage="No models found."
			globalFilter={globalFilter}
			globalFilterFn={fuzzyFilter}
			toolbar={(table) => (
				<MyModelTableToolbar
					globalFilter={globalFilter}
					onGlobalFilterChange={setGlobalFilter}
					rowCount={table.getRowCount()}
				/>
			)}
		/>
	);
}
