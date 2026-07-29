import { CircleAlertIcon, SearchIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { useModelList } from "#/routes/_authenticated/library/-hooks/use-model-list";
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
import { ModelSortSelect } from "./ModelSortSelect";
import { ModelStatusFilter } from "./ModelStatusFilter";

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
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const {
		availableLicenses,
		catalogPageQuery,
		counts,
		handleLicenseChange,
		handleSearchChange,
		handleSortChange,
		handleStatusChange,
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
				<ModelSortSelect value={sort} onValueChange={handleSortChange} />
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 6 }, (_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: a fixed count of interchangeable skeleton rows
						<Skeleton key={index} className="h-16 w-full" />
					))}
				</div>
			) : rows.length === 0 ? (
				<Empty data-testid="model-list-empty">
					<EmptyTitle>No models found</EmptyTitle>
					<EmptyDescription>Try a different search or filter.</EmptyDescription>
				</Empty>
			) : (
				<ItemGroup>
					{rows.map((row) => (
						<Fragment key={row.id}>
							<ModelListItem
								row={row}
								hardware={hardware}
								expanded={expandedId === row.id}
								onToggleExpanded={() =>
									setExpandedId((current) => (current === row.id ? null : row.id))
								}
								onPull={onPull}
								onStop={onStop}
							/>
							{expandedId === row.id && (
								<div className="rounded-lg border bg-muted/30 p-4" data-testid="model-list-detail">
									<ModelDetailPanel
										row={row}
										hardware={hardware}
										pulling={pulling}
										endpointId={endpointId}
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

			<ModelPagination page={page} pageCount={pageCount} onPageChange={setPage} />
		</div>
	);
}
