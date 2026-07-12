import {
	type ColumnDef,
	type ExpandedState,
	type FilterFnOption,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	type Table as TanstackTable,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { ChevronRightIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { DataTablePagination } from "#/shared/components/DataTable/DataTablePagination";
import { cn } from "#/shared/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/shared/ui/table";

type DataTableProps<TData> = {
	columns: ColumnDef<TData>[];
	data: TData[];
	emptyMessage?: string;
	initialSorting?: SortingState;
	/** Columns hidden by default; users can re-show them via the toolbar view options. */
	initialColumnVisibility?: VisibilityState;
	/** Enable client-side pagination at this page size; omit to render every row. */
	pageSize?: number;
	/** Controlled global filter value; manage the input in your toolbar. */
	globalFilter?: string;
	/** Global filter matcher; defaults to a case-insensitive substring match. */
	globalFilterFn?: FilterFnOption<TData>;
	getRowClassName?: (row: TData) => string | undefined;
	/** Rendered above the table; receives the table instance for counts, filters, etc. */
	toolbar?: (table: TanstackTable<TData>) => React.ReactNode;
	/**
	 * Content for a row's expanded detail panel. Supplying this turns on row
	 * expansion end to end: a leading chevron column, whole-row click, and a11y
	 * wiring are all owned by DataTable itself, not the caller.
	 */
	renderDetail?: (row: TData) => React.ReactNode;
};

export function DataTable<TData>({
	columns,
	data,
	emptyMessage = "No results.",
	initialSorting = [],
	initialColumnVisibility = {},
	pageSize,
	globalFilter,
	globalFilterFn = "includesString",
	getRowClassName,
	toolbar,
	renderDetail,
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>(initialSorting);
	const [columnVisibility, setColumnVisibility] =
		useState<VisibilityState>(initialColumnVisibility);
	/** Only one row's detail panel is open at a time, so this tracks a single id rather than a set. */
	const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
	const expanded = useMemo<ExpandedState>(
		() => (expandedRowId ? { [expandedRowId]: true } : {}),
		[expandedRowId],
	);

	const tableColumns = useMemo(
		() => (renderDetail ? [buildExpandColumn<TData>(), ...columns] : columns),
		[columns, renderDetail],
	);

	const table = useReactTable({
		data,
		columns: tableColumns,
		state: { sorting, globalFilter, columnVisibility, expanded },
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		onExpandedChange: (updater) => {
			const current: Record<string, boolean> = expandedRowId ? { [expandedRowId]: true } : {};
			const nextState = typeof updater === "function" ? updater(current) : updater;
			const next = typeof nextState === "boolean" ? {} : nextState;
			const changedId = [...new Set([...Object.keys(current), ...Object.keys(next)])].find(
				(id) => !!next[id] !== !!current[id],
			);
			if (!changedId) return;
			setExpandedRowId(next[changedId] ? changedId : null);
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: pageSize ? getPaginationRowModel() : undefined,
		getExpandedRowModel: renderDetail ? getExpandedRowModel() : undefined,
		getRowCanExpand: renderDetail ? () => true : undefined,
		initialState: pageSize ? { pagination: { pageSize } } : undefined,
		globalFilterFn,
	});

	return (
		<div className="space-y-3">
			{toolbar?.(table)}
			{pageSize && <DataTablePagination table={table} />}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} className="h-9 text-xs">
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={table.getVisibleFlatColumns().length}
									className="h-24 text-center text-sm text-muted-foreground"
									data-testid="data-table-empty"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<Fragment key={row.id}>
									<TableRow
										key={row.id}
										data-testid="data-table-row"
										role={renderDetail ? "button" : undefined}
										tabIndex={renderDetail ? 0 : undefined}
										aria-expanded={renderDetail ? row.getIsExpanded() : undefined}
										className={cn(
											renderDetail &&
												"cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
											getRowClassName?.(row.original),
										)}
										onClick={(event) => {
											if (!renderDetail) return;
											const target = event.target as HTMLElement;
											const interactive = target.closest('button, a, input, [role="button"]');
											if (interactive && interactive !== event.currentTarget) return;
											row.toggleExpanded();
										}}
										onKeyDown={(event) => {
											if (!renderDetail) return;
											if (event.target !== event.currentTarget) return;
											if (event.key !== "Enter" && event.key !== " ") return;
											event.preventDefault();
											row.toggleExpanded();
										}}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id} className="py-2" data-testid="data-table-cell">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
									{renderDetail && row.getIsExpanded() && (
										<TableRow key={`${row.id}-detail`} data-testid="data-table-detail-row">
											<TableCell
												colSpan={table.getVisibleFlatColumns().length}
												className="bg-muted/30 p-4"
											>
												{renderDetail(row.original)}
											</TableCell>
										</TableRow>
									)}
								</Fragment>
							))
						)}
					</TableBody>
				</Table>
			</div>
			{pageSize && <DataTablePagination table={table} />}
		</div>
	);
}

function buildExpandColumn<TData>(): ColumnDef<TData> {
	return {
		id: "__expand",
		header: () => null,
		enableHiding: false,
		enableSorting: false,
		size: 32,
		cell: ({ row }) => (
			<span
				data-testid="data-table-expand-toggle"
				aria-hidden="true"
				className="flex size-6 items-center justify-center text-muted-foreground"
			>
				<ChevronRightIcon
					size={14}
					className={cn("transition-transform", row.getIsExpanded() && "rotate-90")}
				/>
			</span>
		),
	};
}
