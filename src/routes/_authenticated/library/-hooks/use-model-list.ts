import { rankItem } from "@tanstack/match-sorter-utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ModelStatus } from "#/routes/_authenticated/library/-components/ModelList/ModelStatusFilter";
import { buildModelFacets } from "#/routes/_authenticated/library/-lib/facets";
import {
	buildModelRows,
	type ModelRow,
	matchesModelFacets,
} from "#/routes/_authenticated/library/-lib/model-rows";
import { DEFAULT_SORT, type ModelSort } from "#/routes/_authenticated/library/-lib/model-sort";
import {
	classifyHardwareFit,
	type HardwareFit,
	requiredMemoryGb,
} from "#/shared/domain/model/hardware-fit";
import {
	catalogByIdsQueryOptions,
	catalogQueryOptions,
	modelVariantsQueryOptions,
} from "#/shared/domain/model/model.functions";
import type { CatalogCapability, CatalogSortBy, HideableFit } from "#/shared/domain/model/schemas";
import type {
	CatalogModel,
	HardwareInfo,
	InstalledModel,
	PullProgress,
} from "#/shared/domain/model/types";
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
	const haystack = `${row.catalog?.displayName ?? row.name} ${row.name} ${row.id} ${
		row.catalog?.tags.join(" ") ?? ""
	} ${row.installed?.quant ?? ""}`;
	return rankItem(haystack, search).passed;
}

type UseModelListProps = {
	installedModels: InstalledModel[];
	pulling: Record<string, PullProgress>;
	hardware: HardwareInfo | undefined;
};

/** Owns the Library model list's catalog queries, local merge, and view state. */
export function useModelList({ installedModels, pulling, hardware }: UseModelListProps) {
	const [page, setPage] = useState(0);
	const [sort, setSort] = useState<ModelSort>(DEFAULT_SORT);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
	const [status, setStatus] = useState<ModelStatus>("all");
	const [licenses, setLicenses] = useState<string[]>([]);
	const [capabilities, setCapabilities] = useState<CatalogCapability[]>([]);
	const [hiddenFits, setHiddenFits] = useState<HideableFit[]>(["wont-fit"]);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const isInstalledOnly = status === "installed";
	const hasActiveFacets = licenses.length > 0 || capabilities.length > 0;
	// The server can't know the client's hardware for the "installed only" tab (its rows
	// bypass the catalog query), so filter those locally with the same predicate as the server.
	const fitFilter = (row: ModelRow) => {
		if (hiddenFits.length === 0 || row.catalog === null) return true;
		const fit = classifyHardwareFit({ model: row.catalog, hardware });
		const hidden = new Set<HardwareFit>(hiddenFits);
		return fit === null || !hidden.has(fit);
	};
	const catalogPageQuery = useQuery({
		...catalogQueryOptions({
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
	const byIdsQuery = useQuery(catalogByIdsQueryOptions(installedIds));
	const catalogById = new Map<string, CatalogModel>(
		byIdsQuery.data?.map((model): [string, CatalogModel] => [model.id, model]),
	);
	const catalogPage = catalogPageQuery.data?.rows ?? [];
	const total = catalogPageQuery.data?.total ?? 0;
	const availableLicenses = catalogPageQuery.data?.availableLicenses ?? [];

	// Every installed row, independent of the current status tab: the "Available"
	// count below needs it regardless of which tab is showing.
	const installedRows = buildModelRows({
		catalogPage: [],
		catalogById,
		installedModels,
		pulling,
		includeOffPageInstalled: true,
	});

	// The Installed tab's own rows, filtered once and reused for the "Available"
	// subtraction below instead of re-running the same three filters twice.
	let installedTabRows = installedRows.filter(fitFilter);
	if (debouncedSearch) {
		installedTabRows = installedTabRows.filter((row) => matchesSearch(row, debouncedSearch));
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
			// An in-flight download stays visible on every tab, including "Available",
			// where its row would otherwise vanish the moment it left the catalog page.
			includeOffPageInstalled: status === "all",
		});
		base = status === "available" ? merged.filter((row) => !row.installed) : merged;
		if (hasActiveFacets) {
			base = base.filter((row) => matchesModelFacets({ row, licenses, capabilities }));
		}
	}
	const dir = sort.sortDir === "asc" ? 1 : -1;
	const rows = [...base].sort((leftRow, rightRow) => {
		const left = sortValueForRow(leftRow, sort.sortBy);
		const right = sortValueForRow(rightRow, sort.sortBy);
		if (left < right) return -1 * dir;
		if (left > right) return dir;
		return 0;
	});

	// `total` is the server's facet/search-filtered catalog count and knows nothing about
	// install status, so only installed rows still matching it count against it.
	// Not-yet-installed downloads ride in `installedTabRows` but stay on "Available",
	// so they must not be subtracted.
	const matchingInstalledCount = installedTabRows.filter((row) => row.installed !== null).length;

	const counts: Record<ModelStatus, number> = {
		all: total,
		// Total installed (or downloading) count, independent of the active search/facets —
		// distinct from the possibly-narrower rows `installedTabRows` lists on the tab itself.
		installed: installedRows.length,
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
