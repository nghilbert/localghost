import { CircleAlertIcon, SearchIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Alert } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";

import { Empty } from "#/components/ui/empty";
import { InputGroup } from "#/components/ui/input-group";
import { Item } from "#/components/ui/item";
import { useModelList } from "#/features/library/hooks/use-model-list";
import type { HardwareInfo, InstalledModel, PullProgress } from "#/features/library/library.types";
import { ModelActiveFilters } from "./ModelActiveFilters";
import { ModelDetailPanel } from "./ModelDetailPanel";
import { ModelFilterMenu } from "./ModelFilterMenu";
import { ModelListItem } from "./ModelListItem";
import { ModelPagination } from "./ModelPagination";
import { ModelSortControls } from "./ModelSortControls";
import { ModelStatusFilter } from "./ModelStatusFilter";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];

/** The responsive grid the model rows sit in. */
function ModelGrid({ children }: { children: ReactNode }) {
	return (
		<Item.Group className="grid grid-flow-row-dense grid-cols-[repeat(auto-fit,minmax(min(22rem,100%),1fr))]">
			{children}
		</Item.Group>
	);
}

/** Placeholder rows in the list's grid, while the catalog loads. */
export function ModelListSkeleton() {
	return (
		<ModelGrid>
			{SKELETON_KEYS.map((key) => (
				<ModelListItem key={key} isLoading />
			))}
		</ModelGrid>
	);
}

type ModelListProps = {
	installedModels: InstalledModel[];
	pulling: Record<string, PullProgress>;
	hardware: HardwareInfo | undefined;
	/** The local llama.cpp endpoint, for per-model settings. */
	endpointId: string;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
};

/** The Library's model list: a catalog page plus installed and downloading models. */
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
		catalogPageQuery,
		counts,
		expandedId,
		facets,
		fetchedVariants,
		handleSearchChange,
		handleSortChange,
		handleStatusChange,
		handleToggleExpanded,
		isLoading,
		page,
		pageCount,
		rows,
		search,
		setPage,
		sort,
		status,
	} = useModelList({ installedModels, pulling, hardware });

	return (
		<div className="space-y-3">
			{catalogPageQuery.isError && (
				<Alert.Root color="danger">
					<CircleAlertIcon />
					<Alert.Title>Couldn't load the model catalog</Alert.Title>
					<Alert.Description>
						Hugging Face couldn't be reached or didn't return a readable catalog, so only installed
						models are listed.
					</Alert.Description>
					<Alert.Action>
						<Button
							size="sm"
							color="neutral"
							variant="outlined"
							onClick={() => catalogPageQuery.refetch()}
						>
							Try again
						</Button>
					</Alert.Action>
				</Alert.Root>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<InputGroup.Root className="flex-1 sm:max-w-xs">
					<InputGroup.Addon>
						<SearchIcon />
					</InputGroup.Addon>
					<InputGroup.Input
						aria-label="Search models"
						placeholder="Search models..."
						value={search}
						onChange={(event) => handleSearchChange(event.target.value)}
					/>
				</InputGroup.Root>
				<ModelFilterMenu facets={facets}>
					<ModelStatusFilter value={status} counts={counts} onValueChange={handleStatusChange} />
				</ModelFilterMenu>
				<ModelSortControls value={sort} onValueChange={handleSortChange} />
				<ModelPagination
					page={page}
					pageCount={pageCount}
					onPageChange={setPage}
					className="ml-auto w-fit shrink-0"
				/>
			</div>

			<ModelActiveFilters facets={facets} />

			{isLoading ? (
				<ModelListSkeleton />
			) : rows.length === 0 ? (
				<Empty.Root>
					<Empty.Title>No models found</Empty.Title>
					<Empty.Description>Try a different search or filter.</Empty.Description>
				</Empty.Root>
			) : (
				<ModelGrid>
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
							)}
						</Fragment>
					))}
				</ModelGrid>
			)}

			<ModelPagination
				page={page}
				pageCount={pageCount}
				onPageChange={setPage}
				className="ml-auto w-fit"
			/>
		</div>
	);
}
