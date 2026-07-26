import {
	type ColumnDef,
	type ColumnFiltersState,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type OnChangeFn,
	type PaginationState,
	type Table as ReactTable,
	type RowData,
	type SortingState,
	type TableOptions,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { ChevronRightIcon } from "lucide-react";
import { Fragment, type ReactNode, useMemo, useState } from "react";
import { Input } from "#/shared/components/ui/input";
import { Skeleton } from "#/shared/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/shared/components/ui/table";
import { cn } from "#/shared/lib/utils";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableViewOptions } from "./DataTableViewOptions";
import { fuzzyFilter } from "./fuzzyFilter";

declare module "@tanstack/react-table" {
	interface ColumnMeta<TData extends RowData, TValue> {
		/** Classes applied to this column's header and body cells, e.g. `hidden md:table-cell`. */
		className?: string;
	}
}

const SKELETON_WIDTHS = ["w-32", "w-20", "w-24", "w-16"];

type DataTableProps<TData> = {
	columns: ColumnDef<TData>[];
	data: TData[];
	emptyMessage?: string;
	initialSorting?: SortingState;
	/** Columns hidden by default; users can re-show them via the toolbar's column menu. */
	initialColumnVisibility?: VisibilityState;
	/** Display names per column id for the toolbar's column menu; falls back to the raw id. */
	columnLabels?: Record<string, string>;
	/** Enable client-side pagination at this page size; omit to render every row. */
	pageSize?: number;
	/**
	 * Turns on server/manual pagination: `data` is already just the current
	 * page's rows, and `pagination`/`onPaginationChange`/`rowCount` (below)
	 * drive paging instead of TanStack's client-side pagination row model.
	 */
	manualPagination?: boolean;
	pagination?: PaginationState;
	onPaginationChange?: OnChangeFn<PaginationState>;
	/** Total row count across all pages; required for correct page counts in manual pagination mode. */
	rowCount?: number;
	/**
	 * Controlled sorting state. Supplying this (with `onSortingChange`) hands
	 * sorting to the caller — `data` is assumed pre-sorted, so the client-side
	 * sorted row model is skipped. Omit both for the default client-side behavior.
	 */
	sorting?: SortingState;
	onSortingChange?: OnChangeFn<SortingState>;
	/** Placeholder for the toolbar's fuzzy search box; omit to render no search box. */
	searchPlaceholder?: string;
	/**
	 * Controlled search text. Supplying this (with `onSearchChange`) hands
	 * search to the caller — `data` is assumed pre-filtered, so the client-side
	 * global fuzzy filter is skipped. Omit both to filter `data` client-side.
	 */
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	/**
	 * Domain-specific filter controls, rendered in the toolbar beside the search
	 * box. Receives the table instance so a filter control can read post-search
	 * facet counts (`column.getFacetedUniqueValues()`) and drive a column filter
	 * directly, instead of the caller hand-filtering rows before DataTable sees
	 * them (which would disagree with the search box).
	 */
	filters?: (table: ReactTable<TData>) => ReactNode;
	/** Stable identifier used to preserve row state when the data changes. */
	getRowId?: TableOptions<TData>["getRowId"];
	getRowClassName?: (row: TData) => string | undefined;
	/**
	 * Content for a row's expanded detail panel. Supplying this turns on row
	 * expansion end to end: a leading chevron column, whole-row click, and a11y
	 * wiring are all owned by DataTable itself, not the caller.
	 */
	renderDetail?: (row: TData) => ReactNode;
	/** Renders skeleton rows in place of the body, e.g. while a page is being fetched. */
	isLoading?: boolean;
};

export function DataTable<TData>({
	columns,
	data,
	emptyMessage = "No results.",
	initialSorting = [],
	initialColumnVisibility = {},
	columnLabels,
	pageSize,
	manualPagination = false,
	pagination: paginationProp,
	onPaginationChange: onPaginationChangeProp,
	rowCount,
	sorting: sortingProp,
	onSortingChange: onSortingChangeProp,
	searchPlaceholder,
	searchValue,
	onSearchChange,
	filters,
	getRowId,
	getRowClassName,
	renderDetail,
	isLoading = false,
}: DataTableProps<TData>) {
	const [internalGlobalFilter, setInternalGlobalFilter] = useState("");
	const [internalSorting, setInternalSorting] = useState<SortingState>(initialSorting);
	const [internalPagination, setInternalPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: pageSize ?? 10,
	});
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] =
		useState<VisibilityState>(initialColumnVisibility);
	/** Only one row's detail panel is open at a time, so this tracks a single id rather than a set. */
	const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
	const expanded = useMemo<ExpandedState>(
		() => (expandedRowId ? { [expandedRowId]: true } : {}),
		[expandedRowId],
	);

	const isManualSorting = sortingProp !== undefined;
	const sorting = sortingProp ?? internalSorting;
	const onSortingChange = onSortingChangeProp ?? setInternalSorting;

	const isManualFiltering = searchValue !== undefined;
	const globalFilter = searchValue ?? internalGlobalFilter;
	const handleSearchChange = onSearchChange ?? setInternalGlobalFilter;

	const pagination = manualPagination ? (paginationProp ?? internalPagination) : undefined;
	const onPaginationChange = onPaginationChangeProp ?? setInternalPagination;

	const tableColumns = useMemo(
		() => (renderDetail ? [buildExpandColumn<TData>(), ...columns] : columns),
		[columns, renderDetail],
	);

	const table = useReactTable({
		data,
		columns: tableColumns,
		state: {
			sorting,
			globalFilter,
			columnFilters,
			columnVisibility,
			expanded,
			...(manualPagination ? { pagination } : {}),
		},
		onSortingChange,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		...(manualPagination ? { onPaginationChange } : {}),
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
		getSortedRowModel: isManualSorting ? undefined : getSortedRowModel(),
		getFilteredRowModel: isManualFiltering ? undefined : getFilteredRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		getPaginationRowModel: pageSize && !manualPagination ? getPaginationRowModel() : undefined,
		getExpandedRowModel: renderDetail ? getExpandedRowModel() : undefined,
		getRowCanExpand: renderDetail ? () => true : undefined,
		getRowId,
		initialState: pageSize && !manualPagination ? { pagination: { pageSize } } : undefined,
		manualPagination,
		rowCount: manualPagination ? rowCount : undefined,
		manualSorting: isManualSorting,
		manualFiltering: isManualFiltering,
		globalFilterFn: isManualFiltering ? undefined : fuzzyFilter,
	});

	const visibleColumnCount = table.getVisibleFlatColumns().length;
	const skeletonRowCount = Math.min(pagination?.pageSize ?? pageSize ?? 8, 8);
	const skeletonRowIds = useMemo(
		() => Array.from({ length: skeletonRowCount }, () => crypto.randomUUID()),
		[skeletonRowCount],
	);
	const skeletonColumnIds = useMemo(
		() => Array.from({ length: visibleColumnCount }, () => crypto.randomUUID()),
		[visibleColumnCount],
	);

	return (
		<div className="space-y-3">
			{(searchPlaceholder || filters) && (
				<div className="flex flex-wrap items-center gap-2">
					{searchPlaceholder && (
						<Input
							placeholder={searchPlaceholder}
							value={globalFilter}
							onChange={(event) => handleSearchChange(event.target.value)}
							className="w-full sm:max-w-xs"
							data-testid="data-table-search"
						/>
					)}
					{filters?.(table)}
					<div className="ml-auto">
						<DataTableViewOptions table={table} labels={columnLabels} />
					</div>
				</div>
			)}
			{(pageSize || manualPagination) && <DataTablePagination table={table} />}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} className={header.column.columnDef.meta?.className}>
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							skeletonRowIds.map((rowId) => (
								<TableRow key={rowId} data-testid="data-table-skeleton-row">
									{skeletonColumnIds.map((colId, colIndex) => (
										<TableCell key={colId}>
											<Skeleton
												className={cn("h-4", SKELETON_WIDTHS[colIndex % SKELETON_WIDTHS.length])}
											/>
										</TableCell>
									))}
								</TableRow>
							))
						) : table.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={visibleColumnCount}
									className="h-24 text-center text-muted-foreground"
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
											<TableCell
												key={cell.id}
												className={cell.column.columnDef.meta?.className}
												data-testid="data-table-cell"
											>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
									{renderDetail && row.getIsExpanded() && (
										<TableRow key={`${row.id}-detail`} data-testid="data-table-detail-row">
											<TableCell
												colSpan={visibleColumnCount}
												className="whitespace-normal bg-muted/30 p-4"
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
			{(pageSize || manualPagination) && <DataTablePagination table={table} />}
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
