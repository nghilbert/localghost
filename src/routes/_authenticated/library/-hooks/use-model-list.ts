import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import type { ModelSort } from "#/routes/_authenticated/library/-components/ModelList/ModelSortSelect";
import type { ModelStatus } from "#/routes/_authenticated/library/-components/ModelList/ModelStatusFilter";
import { buildModelRows, type ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import { requiredMemoryGb } from "#/shared/domain/model/hardware-fit";
import {
	catalogByIdsQueryOptions,
	catalogQueryOptions,
} from "#/shared/domain/model/model.functions";
import type { CatalogSortBy } from "#/shared/domain/model/schemas";
import type { CatalogModel, InstalledModel, PullProgress } from "#/shared/domain/model/types";
import { useDebouncedValue } from "#/shared/hooks/use-debounced-value";

const PAGE_SIZE = 20;
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
	const [sort, setSort] = useState<ModelSort>({ sortBy: "pullCount", sortDir: "desc" });
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
	const [status, setStatus] = useState<ModelStatus>("all");
	const [license, setLicense] = useState<string | undefined>(undefined);

	const isInstalledOnly = status === "installed";
	const catalogPageQuery = useQuery({
		...catalogQueryOptions({
			page,
			pageSize: PAGE_SIZE,
			sortBy: sort.sortBy,
			sortDir: sort.sortDir,
			search: debouncedSearch || undefined,
			license,
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

	const rows = useMemo(() => {
		let base: ModelRow[];
		if (isInstalledOnly) {
			base = buildModelRows({
				catalogPage: [],
				catalogById,
				installedModels,
				pulling,
				includeOffPageInstalled: true,
			});
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
		debouncedSearch,
		installedModels,
		isInstalledOnly,
		pulling,
		sort,
		status,
	]);

	const counts: Record<ModelStatus, number> = {
		all: total,
		installed: installedModels.length,
		available: Math.max(total - installedModels.length, 0),
	};
	const pageCount = isInstalledOnly ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE));

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
	const handleLicenseChange = useCallback((value: string | undefined) => {
		setLicense(value);
		setPage(0);
	}, []);

	return {
		availableLicenses,
		catalogPageQuery,
		counts,
		handleLicenseChange,
		handleSearchChange,
		handleSortChange,
		handleStatusChange,
		isInstalledOnly,
		isLoading: !isInstalledOnly && catalogPageQuery.isPending,
		license,
		page,
		pageCount,
		rows,
		search,
		setPage,
		sort,
		status,
	};
}
