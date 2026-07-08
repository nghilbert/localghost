import type { ColumnDef } from "@tanstack/react-table";
import {
	MemoryCell,
	ModelIdentityCell,
	ParamsCell,
	SizeCell,
	TextCell,
} from "#/features/pull-model/components/ModelCells";
import { ModelActionsCell } from "#/features/pull-model/components/ModelTable/ModelActionsCell";
import { parsePullCount, requiredMemoryGb } from "#/features/pull-model/lib/catalog";
import type { ModelRow } from "#/features/pull-model/lib/model-rows";
import { DataTableColumnHeader } from "#/shared/ui/DataTable/DataTableColumnHeader";

type ModelColumnOptions = {
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDismiss: (model: string) => void;
	onDelete: (model: string) => void;
};

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

export function createModelColumns({
	onPull,
	onStop,
	onDismiss,
	onDelete,
}: ModelColumnOptions): ColumnDef<ModelRow>[] {
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
		},
		{
			id: "memory",
			accessorFn: (row) => nullableNumber(row.catalog && requiredMemoryGb(row.catalog)),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Memory" />,
			cell: ({ row }) => (
				<MemoryCell gb={row.original.catalog ? requiredMemoryGb(row.original.catalog) : null} />
			),
		},
		{
			id: "size",
			accessorFn: (row) =>
				nullableNumber(row.installed ? row.installed.sizeBytes / 1e9 : row.catalog?.sizeGb),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Size" />,
			cell: ({ row }) => <SizeCell row={row.original} />,
		},
		{
			id: "pulls",
			accessorFn: (row) => parsePullCount(row.catalog?.pullCount ?? ""),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Pulls" />,
			cell: ({ row }) => <TextCell value={row.original.catalog?.pullCount} />,
		},
		{
			id: "updated",
			accessorFn: (row) => row.catalog?.updatedAt ?? "",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
			cell: ({ row }) => <TextCell value={row.original.catalog?.updated} />,
		},
		{
			id: "actions",
			enableHiding: false,
			header: "",
			cell: ({ row }) => (
				<ModelActionsCell
					modelId={row.original.id}
					installed={row.original.installed}
					pullState={row.original.pullState}
					onStop={onStop}
					onPull={onPull}
					onDismiss={onDismiss}
					onDelete={onDelete}
				/>
			),
		},
	];
}
