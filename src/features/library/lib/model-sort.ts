import type { CatalogSortBy } from "#/features/library/library.schemas";

/** The catalog's sort field and direction. */
export type ModelSort = { sortBy: CatalogSortBy; sortDir: "asc" | "desc" };

/** The sort fields, in menu order. */
export const SORT_FIELDS: { id: CatalogSortBy; label: string }[] = [
	{ id: "pullCount", label: "Most downloads" },
	{ id: "likes", label: "Most likes" },
	{ id: "createdAt", label: "Recently created" },
	{ id: "updatedAt", label: "Recently updated" },
	{ id: "name", label: "Name" },
	{ id: "paramB", label: "Parameters" },
	{ id: "sizeGb", label: "Download size" },
	{ id: "memory", label: "Est. memory" },
];

const ASCENDING_BY_DEFAULT: ReadonlySet<CatalogSortBy> = new Set(["name", "sizeGb", "memory"]);

/** The direction a newly picked sort field starts in, e.g. most downloads first. */
export function defaultSortDirFor(field: CatalogSortBy): "asc" | "desc" {
	return ASCENDING_BY_DEFAULT.has(field) ? "asc" : "desc";
}

/** Most downloaded first. */
export const DEFAULT_SORT: ModelSort = { sortBy: "pullCount", sortDir: "desc" };
