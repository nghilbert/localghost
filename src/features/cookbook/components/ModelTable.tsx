import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowUpDownIcon,
	CheckCircle2Icon,
	ChevronDownIcon,
	ChevronUpIcon,
	DownloadIcon,
	Loader2Icon,
	Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Progress } from "#/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { CATALOG, computeFit } from "#/features/cookbook/lib/catalog";
import type {
	CatalogModel,
	FitScore,
	HardwareInfo,
	OllamaInstalledModel,
	PullProgress,
} from "#/features/cookbook/lib/types";
import { cn } from "#/lib/utils";

type ModelRow = {
	model: CatalogModel;
	fit: FitScore;
	installed: OllamaInstalledModel | null;
};

type FitBadgeProps = { tier: FitScore["tier"]; overall: number };

function FitBadge({ tier, overall }: FitBadgeProps) {
	const label =
		tier === "gpu-optimal"
			? "GPU"
			: tier === "gpu-tight"
				? "GPU (tight)"
				: tier === "cpu-only"
					? "CPU"
					: "Too large";

	const variant =
		tier === "gpu-optimal"
			? "default"
			: tier === "gpu-tight"
				? "secondary"
				: tier === "cpu-only"
					? "outline"
					: ("outline" as const);

	return (
		<div className="flex items-center gap-1.5">
			<Badge
				variant={variant}
				className={cn(
					"text-[10px]",
					tier === "too-large" && "text-muted-foreground",
					tier === "gpu-optimal" && "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
					tier === "gpu-tight" && "text-yellow-600",
				)}
			>
				{label}
			</Badge>
			<span className="text-xs text-muted-foreground">{overall}</span>
		</div>
	);
}

type SortButtonProps = {
	children: React.ReactNode;
	isSorted: false | "asc" | "desc";
	onClick: () => void;
};

function SortButton({ children, isSorted, onClick }: SortButtonProps) {
	return (
		<Button
			variant="ghost"
			size="sm"
			className="-ml-2 h-auto gap-1 px-2 py-1 text-xs font-normal text-muted-foreground hover:text-foreground"
			onClick={onClick}
		>
			{children}
			{isSorted === "asc" ? (
				<ChevronUpIcon size={13} />
			) : isSorted === "desc" ? (
				<ChevronDownIcon size={13} />
			) : (
				<ArrowUpDownIcon size={12} className="opacity-40" />
			)}
		</Button>
	);
}

function formatBytes(bytes: number) {
	if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
	return `${(bytes / 1e6).toFixed(0)} MB`;
}

type ModelTableProps = {
	hardware: HardwareInfo | undefined;
	installedModels: OllamaInstalledModel[];
	pulling: Record<string, PullProgress>;
	onPull: (model: string) => void;
	onDelete: (model: string) => void;
};

export function ModelTable({
	hardware,
	installedModels,
	pulling,
	onPull,
	onDelete,
}: ModelTableProps) {
	const [sorting, setSorting] = useState<SortingState>([{ id: "overall", desc: true }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "installed" | "available">("all");

	const installedByName = useMemo(
		() => new Map(installedModels.map((m) => [m.name, m])),
		[installedModels],
	);

	const rows: ModelRow[] = useMemo(() => {
		return CATALOG.map((model) => ({
			model,
			fit: hardware
				? computeFit(model, hardware)
				: { tier: "too-large", gpuHeadroomPct: null, cpuHeadroomGb: 0, overall: 0 },
			installed: installedByName.get(model.id) ?? null,
		}));
	}, [hardware, installedByName]);

	const filteredRows = useMemo(() => {
		let result = rows;
		if (statusFilter === "installed") result = result.filter((r) => r.installed);
		if (statusFilter === "available") result = result.filter((r) => !r.installed);
		return result;
	}, [rows, statusFilter]);

	const columns: ColumnDef<ModelRow>[] = [
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
							{installed && <CheckCircle2Icon size={12} className="shrink-0 text-emerald-500" />}
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
			filterFn: "includesString",
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
			header: ({ column }) => (
				<SortButton
					isSorted={column.getIsSorted()}
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Params
				</SortButton>
			),
			cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.model.paramB}B</span>,
		},
		{
			id: "context",
			accessorFn: (row) => row.model.contextK,
			header: ({ column }) => (
				<SortButton
					isSorted={column.getIsSorted()}
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Context
				</SortButton>
			),
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
			header: ({ column }) => (
				<SortButton
					isSorted={column.getIsSorted()}
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					VRAM
				</SortButton>
			),
			cell: ({ row }) => (
				<span className="text-xs tabular-nums">{row.original.model.vramGb} GB</span>
			),
		},
		{
			id: "ram",
			accessorFn: (row) => row.model.ramGb,
			header: ({ column }) => (
				<SortButton
					isSorted={column.getIsSorted()}
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					RAM
				</SortButton>
			),
			cell: ({ row }) => (
				<span className="text-xs tabular-nums">{row.original.model.ramGb} GB</span>
			),
		},
		{
			id: "overall",
			accessorFn: (row) => row.fit.overall,
			header: ({ column }) => (
				<SortButton
					isSorted={column.getIsSorted()}
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Fit
				</SortButton>
			),
			cell: ({ row }) => {
				const { fit } = row.original;
				if (!hardware) return <span className="text-xs text-muted-foreground">—</span>;
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
			cell: ({ row }) => {
				const { model, installed } = row.original;
				const pullState = pulling[model.id];

				if (pullState) {
					const pct =
						pullState.total && pullState.completed
							? Math.round((pullState.completed / pullState.total) * 100)
							: null;
					return (
						<div className="flex min-w-32 flex-col gap-1">
							<div className="flex items-center gap-1.5">
								<Loader2Icon size={11} className="animate-spin text-muted-foreground" />
								<span className="truncate text-[10px] text-muted-foreground">
									{pullState.error ? `Error: ${pullState.error}` : (pullState.status ?? "…")}
								</span>
							</div>
							{pct !== null && <Progress value={pct} className="h-1" />}
						</div>
					);
				}

				if (installed) {
					return (
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground hover:text-destructive"
							onClick={() => onDelete(model.id)}
							title="Delete model"
						>
							<Trash2Icon size={13} />
						</Button>
					);
				}

				return (
					<Button
						variant="ghost"
						size="sm"
						className="gap-1 text-xs"
						onClick={() => onPull(model.id)}
					>
						<DownloadIcon size={12} />
						Pull
					</Button>
				);
			},
		},
	];

	const table = useReactTable({
		data: filteredRows,
		columns,
		state: { sorting, columnFilters, globalFilter },
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		globalFilterFn: "includesString",
	});

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Input
					placeholder="Search models…"
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
					className="max-w-xs h-8 text-sm"
				/>
				<Select
					value={statusFilter}
					onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
				>
					<SelectTrigger className="h-8 w-36 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All models</SelectItem>
						<SelectItem value="installed">Installed</SelectItem>
						<SelectItem value="available">Not installed</SelectItem>
					</SelectContent>
				</Select>
				<span className="ml-auto text-xs text-muted-foreground">
					{table.getRowCount()} model{table.getRowCount() !== 1 ? "s" : ""}
				</span>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((hg) => (
							<TableRow key={hg.id}>
								{hg.headers.map((header) => (
									<TableHead key={header.id} className="h-9 text-xs">
										{flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center text-sm text-muted-foreground"
								>
									No models found.
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id} className={cn(row.original.installed && "bg-emerald-500/5")}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className="py-2">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
