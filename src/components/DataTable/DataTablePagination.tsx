import type { Table } from "@tanstack/react-table";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "#/components/ui/pagination";

type DataTablePaginationProps<TData> = {
	table: Table<TData>;
};

/** Prev/next controls plus a page indicator for a client-paginated DataTable. */
export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
	const { pageIndex } = table.getState().pagination;
	const pageCount = table.getPageCount();
	if (pageCount <= 1) return null;

	return (
		<Pagination className="justify-between">
			<span className="text-xs text-muted-foreground">
				Page {pageIndex + 1} of {pageCount}
			</span>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						data-testid="data-table-prev-page"
						onClick={() => table.previousPage()}
						aria-disabled={!table.getCanPreviousPage()}
						className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : undefined}
					/>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext
						data-testid="data-table-next-page"
						onClick={() => table.nextPage()}
						aria-disabled={!table.getCanNextPage()}
						className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : undefined}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
