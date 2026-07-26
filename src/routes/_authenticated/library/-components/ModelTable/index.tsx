import { useQuery } from "@tanstack/react-query";
import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { CircleAlertIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { buildModelRows, type ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import { DataTable } from "#/shared/components/DataTable";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/shared/components/ui/alert";
import { Button } from "#/shared/components/ui/button";
import { requiredMemoryGb } from "#/shared/domain/model/hardware-fit";
import {
	catalogByIdsQueryOptions,
	catalogQueryOptions,
} from "#/shared/domain/model/model.functions";
import type { CatalogSortBy } from "#/shared/domain/model/schemas";
import type { HardwareInfo, InstalledModel, PullProgress } from "#/shared/domain/model/types";
import { useDebouncedValue } from "#/shared/hooks/use-debounced-value";
import { cn } from "#/shared/lib/utils";
import { createModelColumns, MODEL_COLUMN_LABELS } from "./columns";
import { LicenseFilter } from "./LicenseFilter";
import { ModelDetailPanel } from "./ModelDetailPanel";
import { type ModelStatus, ModelStatusFilter } from "./ModelStatusFilter";

type ModelTableProps = {
	installedModels: InstalledModel[];
	pulling: Record<string, PullProgress>;
	hardware: HardwareInfo | undefined;
	/** The local llama.cpp endpoint's id, for the expanded row's per-model settings. */
	endpointId: string;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
	initialColumnVisibility?: VisibilityState;
};

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

/** Maps a table column id to the server's sort field, for the one case they diverge ("updated"/"createdAt"). */
const SORT_BY_COLUMN: Record<string, CatalogSortBy> = {
	name: "name",
	params: "paramB",
	memory: "memory",
	size: "sizeGb",
	pulls: "pullCount",
	likes: "likes",
	updated: "updatedAt",
	created: "createdAt",
};

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
	const haystack =
		`${row.name} ${row.id} ${row.catalog?.tags.join(" ") ?? ""} ${row.installed?.quant ?? ""}`.toLowerCase();
	return haystack.includes(search.toLowerCase());
}

/** The Library's model table: a server-paginated catalog page merged with installed and in-flight rows. */
export function ModelTable({
	installedModels,
	pulling,
	hardware,
	endpointId,
	onPull,
	onStop,
	onDelete,
	initialColumnVisibility,
}: ModelTableProps) {
	const [page, setPage] = useState(0);
	const [sorting, setSorting] = useState<SortingState>([{ id: "updated", desc: true }]);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
	const [status, setStatus] = useState<ModelStatus>("all");
	const [license, setLicense] = useState<string | undefined>(undefined);

	const isInstalledOnly = status === "installed";
	const sortColumn = sorting[0];
	const sortBy: CatalogSortBy = (sortColumn && SORT_BY_COLUMN[sortColumn.id]) || "pullCount";
	const sortDir = sortColumn?.desc === false ? "asc" : "desc";

	const catalogPageQuery = useQuery({
		...catalogQueryOptions({
			page,
			pageSize: PAGE_SIZE,
			sortBy,
			sortDir,
			search: debouncedSearch || undefined,
			license,
		}),
		enabled: !isInstalledOnly,
	});

	const installedIds = useMemo(() => installedModels.map((m) => m.id), [installedModels]);
	const byIdsQuery = useQuery(catalogByIdsQueryOptions(installedIds));
	const catalogById = useMemo(
		() => new Map((byIdsQuery.data ?? []).map((model) => [model.id, model] as const)),
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

		const dir = sortDir === "asc" ? 1 : -1;
		return [...base].sort((a, b) => {
			const left = sortValueForRow(a, sortBy);
			const right = sortValueForRow(b, sortBy);
			if (left < right) return -1 * dir;
			if (left > right) return 1 * dir;
			return 0;
		});
	}, [
		isInstalledOnly,
		catalogPage,
		catalogById,
		installedModels,
		pulling,
		status,
		debouncedSearch,
		sortBy,
		sortDir,
	]);

	const columns = useMemo(() => createModelColumns(), []);

	const counts: Record<ModelStatus, number> = {
		all: total,
		installed: installedModels.length,
		available: Math.max(total - installedModels.length, 0),
	};

	return (
		<div className="space-y-3">
			{catalogPageQuery.isError && (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Couldn't load the model catalog</AlertTitle>
					<AlertDescription>
						Hugging Face couldn't be reached or didn't return a readable catalog, so only installed
						models are listed.
					</AlertDescription>
					<AlertAction>
						<Button size="sm" variant="outline" onClick={() => catalogPageQuery.refetch()}>
							Try again
						</Button>
					</AlertAction>
				</Alert>
			)}
			<DataTable
				key={status}
				columns={columns}
				data={rows}
				getRowId={(row) => row.id}
				emptyMessage="No models found."
				initialColumnVisibility={{ ...initialColumnVisibility }}
				columnLabels={MODEL_COLUMN_LABELS}
				pageSize={isInstalledOnly ? PAGE_SIZE : undefined}
				manualPagination={!isInstalledOnly}
				pagination={{ pageIndex: page, pageSize: PAGE_SIZE }}
				onPaginationChange={(updater) => {
					const current = { pageIndex: page, pageSize: PAGE_SIZE };
					const next = typeof updater === "function" ? updater(current) : updater;
					setPage(next.pageIndex);
				}}
				rowCount={total}
				sorting={sorting}
				onSortingChange={(updater) => {
					const next = typeof updater === "function" ? updater(sorting) : updater;
					setSorting(next);
					setPage(0);
				}}
				searchPlaceholder="Search models…"
				searchValue={search}
				onSearchChange={(value) => {
					setSearch(value);
					setPage(0);
				}}
				filters={() => (
					<>
						<ModelStatusFilter
							value={status}
							counts={counts}
							onValueChange={(next) => {
								setStatus(next);
								setPage(0);
							}}
						/>
						<LicenseFilter
							licenses={availableLicenses}
							value={license}
							onValueChange={(next) => {
								setLicense(next);
								setPage(0);
							}}
						/>
					</>
				)}
				getRowClassName={(row) => cn(row.installed && "bg-success/5")}
				isLoading={!isInstalledOnly && catalogPageQuery.isPending}
				renderDetail={(row) => (
					<ModelDetailPanel
						row={row}
						hardware={hardware}
						pulling={pulling}
						endpointId={endpointId}
						onPull={onPull}
						onStop={onStop}
						onDelete={onDelete}
					/>
				)}
			/>
		</div>
	);
}
