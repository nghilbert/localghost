import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import type { ModelStatus } from "#/routes/_authenticated/library/-components/ModelList/ModelStatusFilter";
import {
	buildModelRows,
	type ModelRow,
	matchesModelFacets,
} from "#/routes/_authenticated/library/-lib/model-rows";
import { DEFAULT_SORT, type ModelSort } from "#/routes/_authenticated/library/-lib/model-sort";
import { requiredMemoryGb } from "#/shared/domain/model/hardware-fit";
import {
	catalogByIdsQueryOptions,
	catalogQueryOptions,
	modelVariantsQueryOptions,
} from "#/shared/domain/model/model.functions";
import type { CatalogCapability, CatalogSortBy } from "#/shared/domain/model/schemas";
import type { CatalogModel, InstalledModel, PullProgress } from "#/shared/domain/model/types";
import { useDebouncedValue } from "#/shared/hooks/use-debounced-value";

export const CATALOG_PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

function sortValueForRow(row: ModelRow, sortBy: CatalogSortBy): number | string {
	const catalog = row.catalog;
	switch (sortBy) {
		case "name":
			return (catalog?.displayName ?? row.name).toLowerCase();
		case "paramB":
			return catalog?.paramB ?? row.installed?.paramB ?? Number.NEGATIVE_INFINITY;
		case "sizeGb":
			return (
				catalog?.sizeGb ??
				(row.installed?.sizeBytes != null
					? row.installed.sizeBytes / 1e9
					: Number.NEGATIVE_INFINITY)
			);
		case "pullCount":
			return catalog?.pullCount ?? 0;
		case "likes":
			return catalog?.likes ?? 0;
		case "updatedAt":
			return catalog?.updatedAt ?? "";
		case "createdAt":
			return catalog?.createdAt ?? "";
		case "memory":
			return catalog
				? (requiredMemoryGb(catalog) ?? Number.NEGATIVE_INFINITY)
				: Number.NEGATIVE_INFINITY;
		default:
			return 0;
	}
}

function matchesSearch(row: ModelRow, search: string): boolean {
	const haystack = `${row.name} ${row.id} ${row.catalog?.tags.join(" ") ?? ""} ${
		row.installed?.quant ?? ""
	}`.toLowerCase();
	return haystack.includes(search.toLowerCase());
}

type UseModelListProps = {
	installedModels: InstalledModel[];
	pulling: Record<string, PullProgress>;
};

/** Owns the Library model list's catalog queries, local merge, and view state. */
export function useModelList({ installedModels, pulling }: UseModelListProps) {
	const [page, setPage] = useState(0);
	const [sort, setSort] = useState<ModelSort>(DEFAULT_SORT);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
	const [status, setStatus] = useState<ModelStatus>("all");
	const [licenses, setLicenses] = useState<string[]>([]);
	const [capabilities, setCapabilities] = useState<CatalogCapability[]>([]);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const isInstalledOnly = status === "installed";
	const hasActiveFacets = licenses.length > 0 || capabilities.length > 0;
	const catalogPageQuery = useQuery({
		...catalogQueryOptions({
			page,
			pageSize: CATALOG_PAGE_SIZE,
			sortBy: sort.sortBy,
			sortDir: sort.sortDir,
			search: debouncedSearch || undefined,
			licenses: licenses.length > 0 ? licenses : undefined,
			capabilities: capabilities.length > 0 ? capabilities : undefined,
		}),
		enabled: !isInstalledOnly,
	});

	const installedIds = useMemo(() => installedModels.map((model) => model.id), [installedModels]);
	const byIdsQuery = useQuery(catalogByIdsQueryOptions(installedIds));
	const catalogById = useMemo(
		() =>
			new Map<string, CatalogModel>(
				(byIdsQuery.data ?? []).map((model): [string, CatalogModel] => [model.id, model]),
			),
		[byIdsQuery.data],
	);
	const catalogPage = catalogPageQuery.data?.rows ?? [];
	const total = catalogPageQuery.data?.total ?? 0;
	const availableLicenses = catalogPageQuery.data?.availableLicenses ?? [];

	// Every installed row, independent of the current status tab: the "Available"
	// count below needs it regardless of which tab is showing.
	const installedRows = useMemo(
		() =>
			buildModelRows({
				catalogPage: [],
				catalogById,
				installedModels,
				pulling,
				includeOffPageInstalled: true,
			}),
		[catalogById, installedModels, pulling],
	);

	const rows = useMemo(() => {
		let base: ModelRow[];
		if (isInstalledOnly) {
			base = installedRows;
			if (debouncedSearch) base = base.filter((row) => matchesSearch(row, debouncedSearch));
		} else {
			const merged = buildModelRows({
				catalogPage,
				catalogById,
				installedModels,
				pulling,
				includeOffPageInstalled: status === "all",
			});
			base = status === "available" ? merged.filter((row) => !row.installed) : merged;
		}
		if (hasActiveFacets) {
			base = base.filter((row) => matchesModelFacets({ row, licenses, capabilities }));
		}

		const dir = sort.sortDir === "asc" ? 1 : -1;
		return [...base].sort((leftRow, rightRow) => {
			const left = sortValueForRow(leftRow, sort.sortBy);
			const right = sortValueForRow(rightRow, sort.sortBy);
			if (left < right) return -1 * dir;
			if (left > right) return dir;
			return 0;
		});
	}, [
		catalogById,
		catalogPage,
		capabilities,
		debouncedSearch,
		hasActiveFacets,
		installedModels,
		installedRows,
		isInstalledOnly,
		licenses,
		pulling,
		sort,
		status,
	]);

	// `total` is the server's facet/search-filtered catalog count, which knows
	// nothing about install status; subtracting the raw installed count would
	// double-subtract whenever an active facet excludes some installed models.
	// Only the installed rows that still match the current facets and search
	// count against it.
	const matchingInstalledCount = useMemo(() => {
		let matched = installedRows;
		if (debouncedSearch) matched = matched.filter((row) => matchesSearch(row, debouncedSearch));
		if (hasActiveFacets) {
			matched = matched.filter((row) => matchesModelFacets({ row, licenses, capabilities }));
		}
		return matched.length;
	}, [installedRows, debouncedSearch, hasActiveFacets, licenses, capabilities]);

	const counts: Record<ModelStatus, number> = {
		all: total,
		installed: installedModels.length,
		available: Math.max(total - matchingInstalledCount, 0),
	};
	const pageCount = isInstalledOnly ? 1 : Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));

	const expandedRow = rows.find((row) => row.id === expandedId) ?? null;
	const expandedCatalog = expandedRow?.catalog ?? null;
	const variantsQuery = useQuery({
		...modelVariantsQueryOptions({
			repoId: expandedCatalog?.name ?? "",
			siblingRepoIds: expandedCatalog?.siblingRepoIds ?? [],
		}),
		enabled: expandedCatalog !== null,
	});

	const handleSortChange = useCallback((value: ModelSort) => {
		setSort(value);
		setPage(0);
	}, []);
	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		setPage(0);
	}, []);
	const handleStatusChange = useCallback((value: ModelStatus) => {
		setStatus(value);
		setPage(0);
	}, []);
	const handleLicensesChange = useCallback((value: string[]) => {
		setLicenses(value);
		setPage(0);
	}, []);
	const handleCapabilitiesChange = useCallback((value: CatalogCapability[]) => {
		setCapabilities(value);
		setPage(0);
	}, []);
	const handleToggleExpanded = useCallback((id: string) => {
		setExpandedId((current) => (current === id ? null : id));
	}, []);

	return {
		availableLicenses,
		capabilities,
		catalogPageQuery,
		counts,
		expandedId,
		fetchedVariants: expandedCatalog !== null ? variantsQuery.data : undefined,
		handleCapabilitiesChange,
		handleLicensesChange,
		handleSearchChange,
		handleSortChange,
		handleStatusChange,
		handleToggleExpanded,
		isLoading:
			(!isInstalledOnly && catalogPageQuery.isPending) ||
			(isInstalledOnly && hasActiveFacets && byIdsQuery.isPending),
		licenses,
		page,
		pageCount,
		rows,
		search,
		setPage,
		sort,
		status,
	};
}
