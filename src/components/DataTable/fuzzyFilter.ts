import { rankItem } from "@tanstack/match-sorter-utils";
import type { Row } from "@tanstack/react-table";

/**
 * Global filter ranking a row's value against the query with match-sorter,
 * tolerating typos and out-of-order characters. Generic over the row shape
 * so any table can use it as `globalFilterFn`.
 */
export function fuzzyFilter<TData>(row: Row<TData>, columnId: string, value: unknown): boolean {
	return rankItem(row.getValue(columnId), String(value)).passed;
}
