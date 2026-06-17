import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2Icon } from "lucide-react";
import { DataTableColumnHeader } from "#/components/DataTable/DataTableColumnHeader";
import { Badge } from "#/components/ui/badge";
import { FitBadge } from "#/features/cookbook/components/ModelTable/FitBadge";
import { ModelActionsCell } from "#/features/cookbook/components/ModelTable/ModelActionsCell";
import { formatBytes } from "#/features/cookbook/lib/format";
import type {
	CatalogModel,
	FitScore,
	OllamaInstalledModel,
	PullProgress,
} from "#/features/cookbook/lib/types";

export type ModelRow = {
	model: CatalogModel;
	fit: FitScore;
	installed: OllamaInstalledModel | null;
};

type ModelColumnOptions = {
	hasHardware: boolean;
	pulling: Record<string, PullProgress>;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
};

export function createModelColumns({
	hasHardware,
	pulling,
	onPull,
	onStop,
	onDelete,
}: ModelColumnOptions): ColumnDef<ModelRow>[] {
	return [
		{
			id: "name",
			accessorFn: (row) =>
				`${row.model.name} ${row.model.family} ${row.model.id} ${row.model.tags.join(" ")}`,
			header: "Model",
			cell: ({ row }) => {
				const { model, installed } = row.original;
				return (
					<div className="min-w-0">
						<div className="flex items-center gap-1.5">
							<span className="font-medium text-sm">{model.name}</span>
							<span className="text-xs text-muted-foreground">{model.paramB}B</span>
							{installed && <CheckCircle2Icon size={12} className="shrink-0 text-success" />}
						</div>
						<p className="text-xs text-muted-foreground truncate max-w-xs">{model.description}</p>
						<div className="mt-1 flex flex-wrap gap-0.5">
							{model.tags.map((tag) => (
								<Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0 h-auto">
									{tag}
								</Badge>
							))}
						</div>
					</div>
				);
			},
		},
		{
			id: "family",
			accessorFn: (row) => row.model.family,
			header: "By",
			cell: ({ row }) => (
				<span className="text-xs text-muted-foreground whitespace-nowrap">
					{row.original.model.family}
				</span>
			),
		},
		{
			id: "params",
			accessorFn: (row) => row.model.paramB,
			header: ({ column }) => <DataTableColumnHeader column={column} title="Params" />,
			cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.model.paramB}B</span>,
		},
		{
			id: "context",
			accessorFn: (row) => row.model.contextK,
			header: ({ column }) => <DataTableColumnHeader column={column} title="Context" />,
			cell: ({ row }) => (
				<span className="text-xs text-muted-foreground tabular-nums">
					{row.original.model.contextK < 1
						? `${Math.round(row.original.model.contextK * 1000)}K`
						: `${row.original.model.contextK}K`}
				</span>
			),
		},
		{
			id: "vram",
			accessorFn: (row) => row.model.vramGb,
			header: ({ column }) => <DataTableColumnHeader column={column} title="VRAM" />,
			cell: ({ row }) => (
				<span className="text-xs tabular-nums">{row.original.model.vramGb} GB</span>
			),
		},
		{
			id: "ram",
			accessorFn: (row) => row.model.ramGb,
			header: ({ column }) => <DataTableColumnHeader column={column} title="RAM" />,
			cell: ({ row }) => (
				<span className="text-xs tabular-nums">{row.original.model.ramGb} GB</span>
			),
		},
		{
			id: "overall",
			accessorFn: (row) => row.fit.overall,
			header: ({ column }) => <DataTableColumnHeader column={column} title="Fit" />,
			cell: ({ row }) => {
				const { fit } = row.original;
				if (!hasHardware) return <span className="text-xs text-muted-foreground">—</span>;
				return <FitBadge tier={fit.tier} overall={fit.overall} />;
			},
		},
		{
			id: "size",
			accessorFn: (row) => row.installed?.sizeBytes ?? 0,
			header: "Size",
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
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<ModelActionsCell
					modelId={row.original.model.id}
					installed={row.original.installed}
					pullState={pulling[row.original.model.id]}
					onStop={onStop}
					onPull={onPull}
					onDelete={onDelete}
				/>
			),
		},
	];
}
