import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "#/components/DataTable/DataTableColumnHeader";
import {
	FitCell,
	MemoryCell,
	ModelIdentityCell,
	ParamsCell,
	SizeCell,
	TextCell,
} from "#/features/library/components/ModelCells";
import { ModelActionsCell } from "#/features/library/components/ModelTable/ModelActionsCell";
import { parsePullCount, requiredMemoryGb } from "#/features/library/lib/catalog";
import type { ModelRow } from "#/features/library/lib/model-rows";

type ModelColumnOptions = {
	hasHardware: boolean;
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
	fit: "Fit",
};

/** `null`/`undefined` sort last regardless of direction. */
function nullableNumber(value: number | null | undefined): number {
	return value ?? Number.NEGATIVE_INFINITY;
}

export function createModelColumns({
	hasHardware,
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
			id: "fit",
			accessorFn: (row) => nullableNumber(row.fit?.overall),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Fit" />,
			cell: ({ row }) => <FitCell fit={row.original.fit} hasHardware={hasHardware} />,
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
