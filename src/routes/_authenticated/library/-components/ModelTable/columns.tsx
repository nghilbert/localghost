import type { ColumnDef } from "@tanstack/react-table";
import { parsePullCount, requiredMemoryGb } from "#/routes/_authenticated/library/-lib/catalog";
import type { ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import { DataTableColumnHeader } from "#/shared/components/DataTable/DataTableColumnHeader";
import { MemoryCell, ModelIdentityCell, ParamsCell, SizeCell, TextCell } from "./ModelCells";

/** Display names for the column-visibility menu, keyed by column id. */
export const MODEL_COLUMN_LABELS: Record<string, string> = {
	name: "Model",
	params: "Params",
	memory: "Memory",
	size: "Size",
	pulls: "Pulls",
	updated: "Updated",
};

/** `null`/`undefined` sort last regardless of direction. */
function nullableNumber(value: number | null | undefined): number {
	return value ?? Number.NEGATIVE_INFINITY;
}

export function createModelColumns(): ColumnDef<ModelRow>[] {
	return [
		{
			id: "name",
			accessorFn: (row) =>
				`${row.name} ${row.id} ${row.catalog?.tags.join(" ") ?? ""} ${row.installed?.family ?? ""}`,
			header: ({ column }) => <DataTableColumnHeader column={column} title="Model" />,
			enableHiding: false,
			cell: ({ row }) => <ModelIdentityCell row={row.original} />,
		},
		{
			id: "params",
			accessorFn: (row) => nullableNumber(row.catalog?.paramB),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Params" />,
			cell: ({ row }) => <ParamsCell row={row.original} />,
			meta: { className: "hidden lg:table-cell" },
		},
		{
			id: "memory",
			accessorFn: (row) => nullableNumber(row.catalog && requiredMemoryGb(row.catalog)),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Memory" />,
			cell: ({ row }) => (
				<MemoryCell gb={row.original.catalog ? requiredMemoryGb(row.original.catalog) : null} />
			),
			meta: { className: "hidden md:table-cell" },
		},
		{
			id: "size",
			accessorFn: (row) =>
				nullableNumber(row.installed ? row.installed.sizeBytes / 1e9 : row.catalog?.sizeGb),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Size" />,
			cell: ({ row }) => <SizeCell row={row.original} />,
			meta: { className: "hidden sm:table-cell" },
		},
		{
			id: "pulls",
			accessorFn: (row) => parsePullCount(row.catalog?.pullCount ?? ""),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Pulls" />,
			cell: ({ row }) => <TextCell value={row.original.catalog?.pullCount} />,
			meta: { className: "hidden xl:table-cell" },
		},
		{
			id: "updated",
			accessorFn: (row) => row.catalog?.updatedAt ?? "",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
			cell: ({ row }) => <TextCell value={row.original.catalog?.updated} />,
			meta: { className: "hidden lg:table-cell" },
		},
	];
}
