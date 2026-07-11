import type { Column } from "@tanstack/react-table";
import { ArrowUpDownIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Button } from "#/shared/ui/button";

type DataTableColumnHeaderProps<TData, TValue> = {
	column: Column<TData, TValue>;
	title: string;
};

export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
}: DataTableColumnHeaderProps<TData, TValue>) {
	if (!column.getCanSort()) return <span>{title}</span>;

	const isSorted = column.getIsSorted();

	return (
		<Button
			variant="ghost"
			size="sm"
			className="-ml-2 h-auto gap-1 px-2 py-1 text-xs font-normal text-muted-foreground hover:text-foreground"
			data-testid={`data-table-sort-${column.id}`}
			onClick={() => column.toggleSorting(isSorted === "asc")}
		>
			{title}
			{isSorted === "asc" ? (
				<ChevronUpIcon size={13} />
			) : isSorted === "desc" ? (
				<ChevronDownIcon size={13} />
			) : (
				<ArrowUpDownIcon size={12} className="opacity-40" />
			)}
		</Button>
	);
}
