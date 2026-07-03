import type { Table } from "@tanstack/react-table";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

type DataTableViewOptionsProps<TData> = {
	table: Table<TData>;
	/** Display names per column id; falls back to the raw id when absent. */
	labels?: Record<string, string>;
};

/** Toggle which columns are visible. */
export function DataTableViewOptions<TData>({ table, labels }: DataTableViewOptionsProps<TData>) {
	const columns = table.getAllColumns().filter((column) => column.getCanHide());
	if (columns.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-8" />}>
				<SlidersHorizontalIcon />
				Columns
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{columns.map((column) => (
					<DropdownMenuCheckboxItem
						key={column.id}
						className="capitalize"
						checked={column.getIsVisible()}
						onCheckedChange={(value) => column.toggleVisibility(!!value)}
					>
						{labels?.[column.id] ?? column.id}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
