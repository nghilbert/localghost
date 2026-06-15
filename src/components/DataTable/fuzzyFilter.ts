import { rankItem } from "@tanstack/match-sorter-utils";
import type { Row } from "@tanstack/react-table";

/**
 * Global filter that ranks a row's value against the query with match-sorter,
 * tolerating typos and out-of-order characters. TanStack Table ships no built-in
 * fuzzy matcher, so this is the canonical pattern for fuzzy global search. Generic
 * over the row shape so it can serve as any table's `globalFilterFn`.
 */
export function fuzzyFilter<TData>(row: Row<TData>, columnId: string, value: unknown): boolean {
	return rankItem(row.getValue(columnId), String(value)).passed;
}
