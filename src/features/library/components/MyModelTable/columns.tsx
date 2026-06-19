import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2Icon } from "lucide-react";
import { DataTableColumnHeader } from "#/components/DataTable/DataTableColumnHeader";
import { FitBadge } from "#/features/library/components/ModelTable/FitBadge";
import { ModelActionsCell } from "#/features/library/components/ModelTable/ModelActionsCell";
import { formatBytes } from "#/features/library/lib/format";
import type {
	CatalogModel,
	FitScore,
	OllamaInstalledModel,
	PullProgress,
} from "#/features/library/lib/types";

export type MyModelRow = {
	id: string;
	name: string;
	catalog: CatalogModel | null;
	fit: FitScore | null;
	installed: OllamaInstalledModel | null;
	pullState: PullProgress | undefined;
};

type MyModelColumnOptions = {
	hasHardware: boolean;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
};

export function createMyModelColumns({
	hasHardware,
	onStop,
	onDelete,
}: MyModelColumnOptions): ColumnDef<MyModelRow>[] {
	return [
		{
			id: "name",
			accessorFn: (row) =>
				`${row.name} ${row.id} ${row.catalog?.family ?? row.installed?.family ?? ""}`,
			header: "Model",
			cell: ({ row }) => {
				const { id, name, installed, pullState } = row.original;
				return (
					<div className="min-w-0">
						<div className="flex items-center gap-1.5">
							<span className="font-medium text-sm">{name}</span>
							{installed && !pullState && (
								<CheckCircle2Icon size={12} className="shrink-0 text-success" />
							)}
							{pullState && !pullState.error && (
								<span className="text-[10px] text-muted-foreground">installing</span>
							)}
						</div>
						<p className="text-xs text-muted-foreground truncate max-w-xs">{id}</p>
					</div>
				);
			},
		},
		{
			id: "family",
			accessorFn: (row) => row.catalog?.family ?? row.installed?.family ?? "",
			header: "By",
			cell: ({ row }) => {
				const { catalog, installed } = row.original;
				const family = catalog?.family ?? installed?.family;
				return (
					<span className="text-xs text-muted-foreground whitespace-nowrap">{family ?? "—"}</span>
				);
			},
		},
		{
			id: "params",
			accessorFn: (row) => row.catalog?.paramB ?? 0,
			header: ({ column }) => <DataTableColumnHeader column={column} title="Params" />,
			cell: ({ row }) => {
				const { catalog, installed } = row.original;
				const params = catalog ? `${catalog.paramB}B` : installed?.parameterSize;
				return <span className="text-sm tabular-nums">{params ?? "—"}</span>;
			},
		},
		{
			id: "size",
			accessorFn: (row) => row.installed?.sizeBytes ?? 0,
			header: ({ column }) => <DataTableColumnHeader column={column} title="Size" />,
			cell: ({ row }) => {
				const { installed } = row.original;
				if (!installed) return <span className="text-xs text-muted-foreground">—</span>;
				return (
					<span className="text-xs tabular-nums text-muted-foreground">
						{formatBytes(installed.sizeBytes)}
					</span>
				);
			},
		},
		{
			id: "fit",
			accessorFn: (row) => row.fit?.overall ?? 0,
			header: ({ column }) => <DataTableColumnHeader column={column} title="Fit" />,
			cell: ({ row }) => {
				const { fit } = row.original;
				if (!hasHardware || !fit) return <span className="text-xs text-muted-foreground">—</span>;
				return <FitBadge tier={fit.tier} overall={fit.overall} />;
			},
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<ModelActionsCell
					modelId={row.original.id}
					installed={row.original.installed}
					pullState={row.original.pullState}
					onStop={onStop}
					onDelete={onDelete}
				/>
			),
		},
	];
}
