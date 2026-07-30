import { CircleAlertIcon, SearchIcon } from "lucide-react";
import { Fragment } from "react";
import {
	CATALOG_PAGE_SIZE,
	useModelList,
} from "#/routes/_authenticated/library/-hooks/use-model-list";
import { formatResultRange } from "#/routes/_authenticated/library/-lib/model-sort";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/shared/components/ui/alert";
import { Button } from "#/shared/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "#/shared/components/ui/empty";
import { Input } from "#/shared/components/ui/input";
import { ItemGroup } from "#/shared/components/ui/item";
import { Skeleton } from "#/shared/components/ui/skeleton";
import type { HardwareInfo, InstalledModel, PullProgress } from "#/shared/domain/model/types";
import { LicenseFilter } from "./LicenseFilter";
import { ModelDetailPanel } from "./ModelDetailPanel";
import { ModelListItem } from "./ModelListItem";
import { ModelPagination } from "./ModelPagination";
import { ModelSortControls } from "./ModelSortControls";
import { ModelStatusFilter } from "./ModelStatusFilter";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];

type ModelListProps = {
	installedModels: InstalledModel[];
	pulling: Record<string, PullProgress>;
	hardware: HardwareInfo | undefined;
	/** The local llama.cpp endpoint's id, for the expanded row's per-model settings. */
	endpointId: string;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
};

/** The Library's model list: a server-paginated catalog page merged with installed and in-flight rows. */
export function ModelList({
	installedModels,
	pulling,
	hardware,
	endpointId,
	onPull,
	onStop,
	onDelete,
}: ModelListProps) {
	const {
		availableLicenses,
		catalogPageQuery,
		counts,
		expandedId,
		fetchedVariants,
		handleLicenseChange,
		handleSearchChange,
		handleSortChange,
		handleStatusChange,
		handleToggleExpanded,
		isInstalledOnly,
		isLoading,
		license,
		page,
		pageCount,
		rows,
		search,
		setPage,
		sort,
		status,
	} = useModelList({ installedModels, pulling });
	const resultRange = isInstalledOnly
		? `${counts[status].toLocaleString()} models`
		: formatResultRange({
				page,
				pageSize: CATALOG_PAGE_SIZE,
				total: counts[status],
			});

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

			<div className="flex flex-wrap items-center gap-2">
				<div className="relative flex-1 sm:max-w-xs">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						className="pl-8"
						placeholder="Search models…"
						value={search}
						onChange={(event) => handleSearchChange(event.target.value)}
						data-testid="model-list-search"
					/>
				</div>
				<ModelStatusFilter value={status} counts={counts} onValueChange={handleStatusChange} />
				<LicenseFilter
					licenses={availableLicenses}
					value={license}
					onValueChange={handleLicenseChange}
				/>
				<ModelSortControls value={sort} onValueChange={handleSortChange} />
				{resultRange && (
					<span className="text-xs text-muted-foreground" data-testid="model-list-total">
						{resultRange}
					</span>
				)}
			</div>

			<ModelPagination page={page} pageCount={pageCount} onPageChange={setPage} position="top" />

			{isLoading ? (
				<div className="space-y-3">
					{SKELETON_KEYS.map((key) => (
						<Skeleton key={key} className="h-16 w-full" />
					))}
				</div>
			) : rows.length === 0 ? (
				<Empty data-testid="model-list-empty">
					<EmptyTitle>No models found</EmptyTitle>
					<EmptyDescription>Try a different search or filter.</EmptyDescription>
				</Empty>
			) : (
				<ItemGroup className="grid grid-cols-[repeat(auto-fit,minmax(min(22rem,100%),1fr))]">
					{rows.map((row) => (
						<Fragment key={row.id}>
							<ModelListItem
								row={row}
								hardware={hardware}
								expanded={expandedId === row.id}
								onToggleExpanded={() => handleToggleExpanded(row.id)}
								onPull={onPull}
								onStop={onStop}
							/>
							{expandedId === row.id && (
								<div
									className="col-span-full rounded-lg border bg-muted/30 p-4"
									data-testid="model-list-detail"
								>
									<ModelDetailPanel
										row={row}
										hardware={hardware}
										pulling={pulling}
										endpointId={endpointId}
										fetchedVariants={fetchedVariants}
										onPull={onPull}
										onStop={onStop}
										onDelete={onDelete}
									/>
								</div>
							)}
						</Fragment>
					))}
				</ItemGroup>
			)}

			<ModelPagination page={page} pageCount={pageCount} onPageChange={setPage} position="bottom" />
		</div>
	);
}
