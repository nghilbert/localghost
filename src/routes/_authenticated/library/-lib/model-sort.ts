import type { CatalogSortBy } from "#/shared/domain/model/schemas";

export type ModelSort = { sortBy: CatalogSortBy; sortDir: "asc" | "desc" };

export const SORT_FIELDS: { id: CatalogSortBy; label: string }[] = [
	{ id: "pullCount", label: "Most pulls" },
	{ id: "likes", label: "Most likes" },
	{ id: "createdAt", label: "Recently created" },
	{ id: "updatedAt", label: "Recently updated" },
	{ id: "name", label: "Name" },
	{ id: "paramB", label: "Parameters" },
	{ id: "sizeGb", label: "Download size" },
	{ id: "memory", label: "Est. memory" },
];

const ASCENDING_BY_DEFAULT: ReadonlySet<CatalogSortBy> = new Set(["name", "sizeGb", "memory"]);

/** The direction a newly-picked field should start in, so "Most pulls" doesn't land on fewest-first. */
export function defaultSortDirFor(field: CatalogSortBy): "asc" | "desc" {
	return ASCENDING_BY_DEFAULT.has(field) ? "asc" : "desc";
}

export const DEFAULT_SORT: ModelSort = { sortBy: "pullCount", sortDir: "desc" };
