import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/shared/components/ui/select";
import type { CatalogSortBy } from "#/shared/domain/model/schemas";

export type ModelSort = { sortBy: CatalogSortBy; sortDir: "asc" | "desc" };

const SORT_OPTIONS: { id: string; label: string; sort: ModelSort }[] = [
	{ id: "popular", label: "Most popular", sort: { sortBy: "pullCount", sortDir: "desc" } },
	{ id: "newest", label: "Newest", sort: { sortBy: "createdAt", sortDir: "desc" } },
	{ id: "name", label: "Name (A–Z)", sort: { sortBy: "name", sortDir: "asc" } },
	{ id: "smallest", label: "Smallest first", sort: { sortBy: "sizeGb", sortDir: "asc" } },
	{ id: "likes", label: "Most liked", sort: { sortBy: "likes", sortDir: "desc" } },
];

function sortId({ sortBy, sortDir }: ModelSort): string {
	return (
		SORT_OPTIONS.find((o) => o.sort.sortBy === sortBy && o.sort.sortDir === sortDir)?.id ??
		"popular"
	);
}

type ModelSortSelectProps = {
	value: ModelSort;
	onValueChange: (value: ModelSort) => void;
};

/** How the catalog is ordered; replaces per-column header sorting now that rows aren't a table. */
export function ModelSortSelect({ value, onValueChange }: ModelSortSelectProps) {
	return (
		<Select
			value={sortId(value)}
			onValueChange={(id) => {
				const option = SORT_OPTIONS.find((o) => o.id === id);
				if (option) onValueChange(option.sort);
			}}
		>
			<SelectTrigger className="w-auto" data-testid="model-sort-select">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{SORT_OPTIONS.map((option) => (
					<SelectItem key={option.id} value={option.id}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
