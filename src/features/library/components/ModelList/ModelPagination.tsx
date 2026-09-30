import { Pagination } from "#/components/ui/pagination";

type ModelPaginationProps = {
	page: number;
	pageCount: number;
	onPageChange: (page: number) => void;
	className?: string;
};

/** Previous and next page buttons for the catalog. */
export function ModelPagination({
	page,
	pageCount,
	onPageChange,
	className,
}: ModelPaginationProps) {
	if (pageCount <= 1) return null;

	return (
		<Pagination.Root aria-label="Model catalog pages" className={className}>
			<Pagination.List>
				<Pagination.Item>
					<Pagination.Previous
						disabled={page === 0}
						onClick={() => onPageChange(Math.max(0, page - 1))}
					/>
				</Pagination.Item>
				<Pagination.Item className="text-sm text-muted-fg">
					Page {page + 1} of {pageCount}
				</Pagination.Item>
				<Pagination.Item>
					<Pagination.Next
						disabled={page >= pageCount - 1}
						onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
					/>
				</Pagination.Item>
			</Pagination.List>
		</Pagination.Root>
	);
}
