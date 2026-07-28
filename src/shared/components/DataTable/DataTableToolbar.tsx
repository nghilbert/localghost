import type { Table } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { Input } from "#/shared/components/ui/input";
import { DataTableViewOptions } from "./DataTableViewOptions";

type DataTableToolbarProps<TData> = {
	table: Table<TData>;
	searchPlaceholder?: string;
	searchValue: string;
	onSearchChange: (value: string) => void;
	filters?: (table: Table<TData>) => ReactNode;
	columnLabels?: Record<string, string>;
};

/** Search, filter, and column controls for a DataTable. */
export function DataTableToolbar<TData>({
	table,
	searchPlaceholder,
	searchValue,
	onSearchChange,
	filters,
	columnLabels,
}: DataTableToolbarProps<TData>) {
	if (!searchPlaceholder && !filters) return null;

	return (
		<div className="flex flex-wrap items-center gap-2">
			{searchPlaceholder && (
				<Input
					placeholder={searchPlaceholder}
					value={searchValue}
					onChange={(event) => onSearchChange(event.target.value)}
					className="w-full sm:max-w-xs"
					data-testid="data-table-search"
				/>
			)}
			{filters?.(table)}
			<div className="ml-auto">
				<DataTableViewOptions table={table} labels={columnLabels} />
			</div>
		</div>
	);
}
