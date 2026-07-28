import type { ColumnDef, Table } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { ChevronRightIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Skeleton } from "#/shared/components/ui/skeleton";
import {
	TableBody as TableBodyPrimitive,
	TableCell,
	TableHead,
	TableHeader,
	Table as TablePrimitive,
	TableRow,
} from "#/shared/components/ui/table";
import { cn } from "#/shared/lib/utils";

const SKELETON_WIDTHS = ["w-32", "w-20", "w-24", "w-16"];

type DataTableBodyProps<TData> = {
	table: Table<TData>;
	emptyMessage: string;
	isLoading: boolean;
	skeletonRowIds: string[];
	skeletonColumnIds: string[];
	getRowClassName?: (row: TData) => string | undefined;
	renderDetail?: (row: TData) => ReactNode;
};

/** Header and row rendering for a DataTable. */
export function DataTableBody<TData>({
	table,
	emptyMessage,
	isLoading,
	skeletonRowIds,
	skeletonColumnIds,
	getRowClassName,
	renderDetail,
}: DataTableBodyProps<TData>) {
	const visibleColumnCount = table.getVisibleFlatColumns().length;

	return (
		<div className="rounded-md border">
			<TablePrimitive>
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
				<TableBodyPrimitive>
					{isLoading ? (
						skeletonRowIds.map((rowId) => (
							<TableRow key={rowId} data-testid="data-table-skeleton-row">
								{skeletonColumnIds.map((columnId, columnIndex) => (
									<TableCell key={columnId}>
										<Skeleton
											className={cn("h-4", SKELETON_WIDTHS[columnIndex % SKELETON_WIDTHS.length])}
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
										if (!(event.target instanceof HTMLElement)) return;
										const target = event.target;
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
									<TableRow data-testid="data-table-detail-row">
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
				</TableBodyPrimitive>
			</TablePrimitive>
		</div>
	);
}

/** Creates DataTable's optional leading expander column. */
export function buildExpandColumn<TData>(): ColumnDef<TData> {
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
