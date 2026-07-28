import type { VisibilityState } from "@tanstack/react-table";
import { CircleAlertIcon } from "lucide-react";
import { useModelTable } from "#/routes/_authenticated/library/-hooks/use-model-table";
import { DataTable } from "#/shared/components/DataTable";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/shared/components/ui/alert";
import { Button } from "#/shared/components/ui/button";
import type { HardwareInfo, InstalledModel, PullProgress } from "#/shared/domain/model/types";
import { cn } from "#/shared/lib/utils";
import { MODEL_COLUMN_LABELS } from "./columns";
import { LicenseFilter } from "./LicenseFilter";
import { ModelDetailPanel } from "./ModelDetailPanel";
import { ModelStatusFilter } from "./ModelStatusFilter";

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
	const {
		availableLicenses,
		catalogPageQuery,
		columns,
		counts,
		handleLicenseChange,
		handlePaginationChange,
		handleSearchChange,
		handleSortingChange,
		handleStatusChange,
		isInstalledOnly,
		license,
		pagination,
		rows,
		search,
		sorting,
		status,
	} = useModelTable({ installedModels, pulling });

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
				pageSize={isInstalledOnly ? pagination.pageSize : undefined}
				manualPagination={!isInstalledOnly}
				pagination={pagination}
				onPaginationChange={handlePaginationChange}
				rowCount={counts.all}
				sorting={sorting}
				onSortingChange={handleSortingChange}
				searchPlaceholder="Search models…"
				searchValue={search}
				onSearchChange={handleSearchChange}
				filters={() => (
					<>
						<ModelStatusFilter value={status} counts={counts} onValueChange={handleStatusChange} />
						<LicenseFilter
							licenses={availableLicenses}
							value={license}
							onValueChange={handleLicenseChange}
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
