import type { ColumnDef } from "@tanstack/react-table";
import type { ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import { DataTableColumnHeader } from "#/shared/components/DataTable/DataTableColumnHeader";
import { formatPullCount, requiredMemoryGb } from "#/shared/domain/model/hardware-fit";
import { MemoryCell, ModelIdentityCell, ParamsCell, SizeCell, TextCell } from "./ModelCells";

/** Display names for the column-visibility menu, keyed by column id. */
export const MODEL_COLUMN_LABELS: Record<string, string> = {
	name: "Model",
	params: "Params",
	memory: "Memory",
	size: "Size",
	pulls: "Pulls",
	updated: "Updated",
	author: "Author",
	license: "License",
	likes: "Likes",
	context: "Context",
	created: "Created",
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
				`${row.name} ${row.id} ${row.catalog?.tags.join(" ") ?? ""} ${row.installed?.quant ?? ""}`,
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
				nullableNumber(
					row.installed?.sizeBytes != null ? row.installed.sizeBytes / 1e9 : row.catalog?.sizeGb,
				),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Size" />,
			cell: ({ row }) => <SizeCell row={row.original} />,
			meta: { className: "hidden sm:table-cell" },
		},
		{
			id: "pulls",
			accessorFn: (row) => row.catalog?.pullCount ?? 0,
			header: ({ column }) => <DataTableColumnHeader column={column} title="Pulls" />,
			cell: ({ row }) => (
				<TextCell
					value={
						row.original.catalog?.pullCount != null
							? formatPullCount(row.original.catalog.pullCount)
							: undefined
					}
				/>
			),
			meta: { className: "hidden xl:table-cell" },
		},
		{
			id: "updated",
			accessorFn: (row) => row.catalog?.updatedAt ?? "",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
			cell: ({ row }) => (
				<TextCell
					value={
						row.original.catalog?.updatedAt
							? new Date(row.original.catalog.updatedAt).toLocaleDateString()
							: undefined
					}
				/>
			),
			meta: { className: "hidden lg:table-cell" },
		},
		{
			id: "author",
			accessorFn: (row) => row.catalog?.author ?? "",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Author" />,
			cell: ({ row }) => <TextCell value={row.original.catalog?.author ?? undefined} />,
			meta: { className: "hidden xl:table-cell" },
		},
		{
			id: "license",
			accessorFn: (row) => row.catalog?.license ?? "",
			header: ({ column }) => <DataTableColumnHeader column={column} title="License" />,
			cell: ({ row }) => <TextCell value={row.original.catalog?.license ?? undefined} />,
			meta: { className: "hidden xl:table-cell" },
		},
		{
			id: "likes",
			accessorFn: (row) => nullableNumber(row.catalog?.likes),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Likes" />,
			cell: ({ row }) => (
				<TextCell
					value={
						row.original.catalog?.likes != null
							? formatPullCount(row.original.catalog.likes)
							: undefined
					}
				/>
			),
			meta: { className: "hidden xl:table-cell" },
		},
		{
			id: "context",
			accessorFn: (row) => nullableNumber(row.catalog?.contextK),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Context" />,
			cell: ({ row }) => (
				<TextCell
					value={row.original.catalog?.contextK ? `${row.original.catalog.contextK}K` : undefined}
				/>
			),
			meta: { className: "hidden lg:table-cell" },
		},
		{
			id: "created",
			accessorFn: (row) => row.catalog?.createdAt ?? "",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
			cell: ({ row }) => (
				<TextCell
					value={
						row.original.catalog?.createdAt
							? new Date(row.original.catalog.createdAt).toLocaleDateString()
							: undefined
					}
				/>
			),
			meta: { className: "hidden xl:table-cell" },
		},
	];
}
