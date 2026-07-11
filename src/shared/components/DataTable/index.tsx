import {
	type ColumnDef,
	type FilterFnOption,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	type Table as TanstackTable,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";
import { DataTablePagination } from "#/shared/components/DataTable/DataTablePagination";
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
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>(initialSorting);
	const [columnVisibility, setColumnVisibility] =
		useState<VisibilityState>(initialColumnVisibility);

	const table = useReactTable({
		data,
		columns,
		state: { sorting, globalFilter, columnVisibility },
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: pageSize ? getPaginationRowModel() : undefined,
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
								<TableRow
									key={row.id}
									data-testid="data-table-row"
									className={getRowClassName?.(row.original)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className="py-2" data-testid="data-table-cell">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
			{pageSize && <DataTablePagination table={table} />}
		</div>
	);
}
