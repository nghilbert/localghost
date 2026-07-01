import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "#/components/DataTable/DataTableColumnHeader";
import {
	FamilyCell,
	FitCell,
	MemoryCell,
	ModelIdentityCell,
	ParamsCell,
	SizeCell,
	TextCell,
} from "#/features/library/components/ModelCells";
import { ModelActionsCell } from "#/features/library/components/ModelTable/ModelActionsCell";
import type { ModelRow } from "#/features/library/lib/model-rows";

type ModelColumnOptions = {
	hasHardware: boolean;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
};

/** Display names for the column-visibility menu, keyed by column id. */
export const MODEL_COLUMN_LABELS: Record<string, string> = {
	name: "Model",
	family: "By",
	params: "Params",
	vram: "VRAM",
	ram: "RAM",
	fit: "Fit",
	size: "Size",
	pulls: "Pulls",
	updated: "Updated",
};

/** `null`/`undefined` sort last regardless of direction. */
function nullableNumber(value: number | null | undefined): number {
	return value ?? Number.NEGATIVE_INFINITY;
}

export function createModelColumns({
	hasHardware,
	onPull,
	onStop,
	onDelete,
}: ModelColumnOptions): ColumnDef<ModelRow>[] {
	return [
		{
			id: "name",
			accessorFn: (row) =>
				`${row.name} ${row.id} ${row.catalog?.tags.join(" ") ?? ""} ${row.installed?.family ?? ""}`,
			header: "Model",
			enableHiding: false,
			cell: ({ row }) => <ModelIdentityCell row={row.original} />,
		},
		{
			id: "family",
			accessorFn: (row) => row.installed?.family ?? "",
			header: "By",
			cell: ({ row }) => <FamilyCell family={row.original.installed?.family} />,
		},
		{
			id: "params",
			accessorFn: (row) => nullableNumber(row.catalog?.paramB),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Params" />,
			cell: ({ row }) => <ParamsCell row={row.original} />,
		},
		{
			id: "vram",
			accessorFn: (row) => nullableNumber(row.catalog?.paramB && row.catalog.vramGb),
			header: ({ column }) => <DataTableColumnHeader column={column} title="VRAM" />,
			cell: ({ row }) => <MemoryCell gb={row.original.catalog?.vramGb ?? 0} />,
		},
		{
			id: "ram",
			accessorFn: (row) => nullableNumber(row.catalog?.paramB && row.catalog.ramGb),
			header: ({ column }) => <DataTableColumnHeader column={column} title="RAM" />,
			cell: ({ row }) => <MemoryCell gb={row.original.catalog?.ramGb ?? 0} />,
		},
		{
			id: "fit",
			accessorFn: (row) => nullableNumber(row.fit?.overall),
			header: ({ column }) => <DataTableColumnHeader column={column} title="Fit" />,
			cell: ({ row }) => <FitCell fit={row.original.fit} hasHardware={hasHardware} />,
		},
		{
			id: "size",
			accessorFn: (row) => row.installed?.sizeBytes ?? 0,
			header: ({ column }) => <DataTableColumnHeader column={column} title="Size" />,
			cell: ({ row }) => <SizeCell installed={row.original.installed} />,
		},
		{
			id: "pulls",
			accessorFn: (row) => row.catalog?.pullCount ?? "",
			header: "Pulls",
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
					onDelete={onDelete}
				/>
			),
		},
	];
}
