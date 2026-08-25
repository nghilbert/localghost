import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "#/shared/components/ui/pagination";

type ModelPaginationProps = {
	page: number;
	pageCount: number;
	onPageChange: (page: number) => void;
	className?: string;
};

/** Prev/next controls for the server-paginated catalog. */
export function ModelPagination({
	page,
	pageCount,
	onPageChange,
	className,
}: ModelPaginationProps) {
	if (pageCount <= 1) return null;

	return (
		<Pagination className={className}>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						data-testid={`model-list-prev-page`}
						onClick={() => onPageChange(Math.max(0, page - 1))}
						aria-disabled={page === 0}
						className={page === 0 ? "pointer-events-none opacity-50" : undefined}
					/>
				</PaginationItem>
				<span className="text-sm text-muted-foreground">
					Page {page + 1} of {pageCount}
				</span>
				<PaginationItem>
					<PaginationNext
						data-testid={`model-list-next-page`}
						onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
						aria-disabled={page >= pageCount - 1}
						className={page >= pageCount - 1 ? "pointer-events-none opacity-50" : undefined}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
