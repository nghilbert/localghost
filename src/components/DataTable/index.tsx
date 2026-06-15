import {
	type ColumnDef,
	type FilterFnOption,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	type Table as TanstackTable,
	useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";

type DataTableProps<TData> = {
	columns: ColumnDef<TData>[];
	data: TData[];
	emptyMessage?: string;
	initialSorting?: SortingState;
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
	globalFilter,
	globalFilterFn = "includesString",
	getRowClassName,
	toolbar,
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>(initialSorting);

	const table = useReactTable({
		data,
		columns,
		state: { sorting, globalFilter },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		globalFilterFn,
	});

	return (
		<div className="space-y-3">
			{toolbar?.(table)}
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
									colSpan={columns.length}
									className="h-24 text-center text-sm text-muted-foreground"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id} className={getRowClassName?.(row.original)}>
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
