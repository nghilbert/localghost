import {
	type ColumnDef,
	type ColumnFiltersState,
	type ExpandedState,
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
import { type ReactNode, useMemo, useState } from "react";
import { buildExpandColumn, DataTableBody } from "./DataTableBody";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";
import { fuzzyFilter } from "./fuzzyFilter";

declare module "@tanstack/react-table" {
	interface ColumnMeta<TData extends RowData, TValue> {
		/** Classes applied to this column's header and body cells, e.g. `hidden md:table-cell`. */
		className?: string;
	}
}

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
	 * sorting to the caller: `data` is assumed pre-sorted, so the client-side
	 * sorted row model is skipped. Omit both for the default client-side behavior.
	 */
	sorting?: SortingState;
	onSortingChange?: OnChangeFn<SortingState>;
	/** Placeholder for the toolbar's fuzzy search box; omit to render no search box. */
	searchPlaceholder?: string;
	/**
	 * Controlled search text. Supplying this (with `onSearchChange`) hands
	 * search to the caller: `data` is assumed pre-filtered, so the client-side
	 * global fuzzy filter is skipped. Omit both to filter `data` client-side.
	 */
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	/** Domain-specific toolbar filters receive the table instance.
	 * They can read faceted counts and set column filters after the search filter.
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
			<DataTableToolbar
				table={table}
				searchPlaceholder={searchPlaceholder}
				searchValue={globalFilter}
				onSearchChange={handleSearchChange}
				filters={filters}
				columnLabels={columnLabels}
			/>
			{(pageSize || manualPagination) && <DataTablePagination table={table} />}
			<DataTableBody
				table={table}
				emptyMessage={emptyMessage}
				isLoading={isLoading}
				skeletonRowIds={skeletonRowIds}
				skeletonColumnIds={skeletonColumnIds}
				getRowClassName={getRowClassName}
				renderDetail={renderDetail}
			/>
			{(pageSize || manualPagination) && <DataTablePagination table={table} />}
		</div>
	);
}
