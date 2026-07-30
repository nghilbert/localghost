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
	/** Disambiguates the two instances (above and below the grid) so their testids don't collide. */
	position: "top" | "bottom";
};

/** Prev/next controls for the server-paginated catalog. */
export function ModelPagination({ page, pageCount, onPageChange, position }: ModelPaginationProps) {
	if (pageCount <= 1) return null;

	return (
		<Pagination className="justify-between">
			<span className="text-xs text-muted-foreground">
				Page {page + 1} of {pageCount}
			</span>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						data-testid={`model-list-${position}-prev-page`}
						onClick={() => onPageChange(Math.max(0, page - 1))}
						aria-disabled={page === 0}
						className={page === 0 ? "pointer-events-none opacity-50" : undefined}
					/>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext
						data-testid={`model-list-${position}-next-page`}
						onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
						aria-disabled={page >= pageCount - 1}
						className={page >= pageCount - 1 ? "pointer-events-none opacity-50" : undefined}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
