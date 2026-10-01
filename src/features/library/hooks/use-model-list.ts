import { rankItem } from "@tanstack/match-sorter-utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	catalogSearchText,
	compareModels,
	isFitHidden,
	type SortableModel,
} from "#/features/library/lib/catalog-query";
import { buildModelFacets } from "#/features/library/lib/facets";
import {
	buildModelRows,
	type ModelRow,
	matchesModelFacets,
} from "#/features/library/lib/model-rows";
import { DEFAULT_SORT, type ModelSort } from "#/features/library/lib/model-sort";
import { libraryQueries } from "#/features/library/library.queries";
import {
	type CatalogCapability,
	type CatalogQuery,
	DEFAULT_HIDDEN_FITS,
	type HideableFit,
} from "#/features/library/library.schemas";
import type {
	CatalogModel,
	HardwareInfo,
	InstalledModel,
	ModelStatus,
	PullProgress,
} from "#/features/library/library.types";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { GIB, roundToTenth } from "#/lib/format";

/** Models per catalog page. */
export const CATALOG_PAGE_SIZE = 24;

/** The catalog query the list starts with, so a loader can prefetch it. */
export const DEFAULT_CATALOG_QUERY: CatalogQuery = {
	page: 0,
	pageSize: CATALOG_PAGE_SIZE,
	sortBy: DEFAULT_SORT.sortBy,
	sortDir: DEFAULT_SORT.sortDir,
	hiddenFits: DEFAULT_HIDDEN_FITS,
};
const SEARCH_DEBOUNCE_MS = 300;

/** A row's sort fields: the catalog's, with what the installed model knows for any it lacks. */
function sortableRow(row: ModelRow): SortableModel {
	const { catalog, installed } = row;
	return {
		displayName: catalog?.displayName ?? row.name,
		paramB: catalog?.paramB ?? installed?.paramB ?? null,
		sizeGb:
			catalog?.sizeGb ??
			(installed?.sizeBytes != null ? roundToTenth(installed.sizeBytes / GIB) : null),
		pullCount: catalog?.pullCount ?? 0,
		likes: catalog?.likes ?? 0,
		updatedAt: catalog?.updatedAt,
		createdAt: catalog?.createdAt ?? null,
	};
}

function matchesSearch({ row, search }: { row: ModelRow; search: string }): boolean {
	const catalogText = row.catalog ? catalogSearchText(row.catalog) : row.name;
	const haystack = `${catalogText} ${row.id} ${row.installed?.quant ?? ""}`;
	return rankItem(haystack, search).passed;
}

type UseModelListProps = {
	installedModels: InstalledModel[];
	pulling: Record<string, PullProgress>;
	hardware: HardwareInfo | undefined;
};

/** The Library list's catalog query, installed models, filters, sorting, and paging. */
export function useModelList({ installedModels, pulling, hardware }: UseModelListProps) {
	const [page, setPage] = useState(0);
	const [sort, setSort] = useState<ModelSort>(DEFAULT_SORT);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue({ value: search, delayMs: SEARCH_DEBOUNCE_MS });
	const [status, setStatus] = useState<ModelStatus>("all");
	const [licenses, setLicenses] = useState<string[]>([]);
	const [capabilities, setCapabilities] = useState<CatalogCapability[]>([]);
	const [hiddenFits, setHiddenFits] = useState(DEFAULT_HIDDEN_FITS);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const isInstalledOnly = status === "installed";
	const hasActiveFacets = licenses.length > 0 || capabilities.length > 0;
	// Installed rows skip the catalog query, so the fit filter runs here too.
	const fitFilter = (row: ModelRow) =>
		row.catalog === null || !isFitHidden({ model: row.catalog, hardware, hiddenFits });
	const catalogPageQuery = useQuery({
		...libraryQueries.catalog({
			page,
			pageSize: CATALOG_PAGE_SIZE,
			sortBy: sort.sortBy,
			sortDir: sort.sortDir,
			search: debouncedSearch || undefined,
			licenses: licenses.length > 0 ? licenses : undefined,
			capabilities: capabilities.length > 0 ? capabilities : undefined,
			hiddenFits,
		}),
		enabled: !isInstalledOnly,
	});

	const installedIds = installedModels.map((model) => model.id);
	const byIdsQuery = useQuery(libraryQueries.catalogByIds(installedIds));
	const catalogById = new Map<string, CatalogModel>(
		byIdsQuery.data?.map((model): [string, CatalogModel] => [model.id, model]),
	);
	const catalogPage = catalogPageQuery.data?.rows ?? [];
	const total = catalogPageQuery.data?.total ?? 0;
	const availableLicenses = catalogPageQuery.data?.availableLicenses ?? [];

	// Every installed row, whichever tab shows, for the "Available" count.
	const installedRows = buildModelRows({
		catalogPage: [],
		catalogById,
		installedModels,
		pulling,
		includeOffPageInstalled: true,
	});

	let installedTabRows = installedRows.filter(fitFilter);
	if (debouncedSearch) {
		installedTabRows = installedTabRows.filter((row) =>
			matchesSearch({ row, search: debouncedSearch }),
		);
	}
	if (hasActiveFacets) {
		installedTabRows = installedTabRows.filter((row) =>
			matchesModelFacets({ row, licenses, capabilities }),
		);
	}

	let base: ModelRow[];
	if (isInstalledOnly) {
		base = installedTabRows;
	} else {
		const merged = buildModelRows({
			catalogPage,
			catalogById,
			installedModels,
			pulling,
			includeOffPageInstalled: status === "all",
		});
		base = status === "available" ? merged.filter((row) => !row.installed) : merged;
		if (hasActiveFacets) {
			base = base.filter((row) => matchesModelFacets({ row, licenses, capabilities }));
		}
	}
	const rows = [...base].sort((left, right) =>
		compareModels({ left: sortableRow(left), right: sortableRow(right), ...sort }),
	);

	// `total` counts the filtered catalog, installed or not. Downloads still count as available.
	const matchingInstalledCount = installedTabRows.filter((row) => row.installed !== null).length;

	const counts: Record<ModelStatus, number> = {
		all: total,
		installed: installedModels.length,
		available: Math.max(total - matchingInstalledCount, 0),
	};
	const pageCount = isInstalledOnly ? 1 : Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));

	const expandedRow = rows.find((row) => row.id === expandedId) ?? null;
	const expandedCatalog = expandedRow?.catalog ?? null;
	const variantsQuery = useQuery({
		...libraryQueries.variants({
			repoId: expandedCatalog?.name ?? "",
			siblingRepoIds: expandedCatalog?.siblingRepoIds ?? [],
		}),
		enabled: expandedCatalog !== null,
	});

	const handleSortChange = (value: ModelSort) => {
		setSort(value);
		setPage(0);
	};
	const handleSearchChange = (value: string) => {
		setSearch(value);
		setPage(0);
	};
	const handleStatusChange = (value: ModelStatus) => {
		setStatus(value);
		setPage(0);
	};
	const handleLicensesChange = (value: string[]) => {
		setLicenses(value);
		setPage(0);
	};
	const handleCapabilitiesChange = (value: CatalogCapability[]) => {
		setCapabilities(value);
		setPage(0);
	};
	const handleHiddenFitsChange = (value: HideableFit[]) => {
		setHiddenFits(value);
		setPage(0);
	};
	const handleToggleExpanded = (id: string) => {
		setExpandedId((current) => (current === id ? null : id));
	};

	const facets = buildModelFacets({
		availableLicenses,
		hiddenFits,
		capabilities,
		licenses,
		onHiddenFitsChange: handleHiddenFitsChange,
		onCapabilitiesChange: handleCapabilitiesChange,
		onLicensesChange: handleLicensesChange,
	});

	return {
		catalogPageQuery,
		counts,
		expandedId,
		facets,
		fetchedVariants: expandedCatalog !== null ? variantsQuery.data : undefined,
		handleSearchChange,
		handleSortChange,
		handleStatusChange,
		handleToggleExpanded,
		isLoading:
			(!isInstalledOnly && catalogPageQuery.isPending) ||
			(isInstalledOnly && hasActiveFacets && byIdsQuery.isPending),
		page,
		pageCount,
		rows,
		search,
		setPage,
		sort,
		status,
	};
}
