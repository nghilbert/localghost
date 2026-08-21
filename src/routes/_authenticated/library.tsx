import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HardwareCard } from "#/routes/_authenticated/library/-components/HardwareCard";
import { ModelList } from "#/routes/_authenticated/library/-components/ModelList";
import { ModelListItem } from "#/routes/_authenticated/library/-components/ModelList/ModelListItem";
import { RemoteRuntimeForm } from "#/routes/_authenticated/library/-components/RemoteRuntimeForm";
import { RuntimeSetupCard } from "#/routes/_authenticated/library/-components/RuntimeSetupCard";
import { CATALOG_PAGE_SIZE } from "#/routes/_authenticated/library/-hooks/use-model-list";
import { DEFAULT_SORT } from "#/routes/_authenticated/library/-lib/model-sort";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/shared/components/ui/alert-dialog";
import { Button } from "#/shared/components/ui/button";
import { Container } from "#/shared/components/ui/container";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/shared/components/ui/item";
import { Separator } from "#/shared/components/ui/separator";
import { Skeleton } from "#/shared/components/ui/skeleton";
import {
	catalogQueryOptions,
	hardwareQueryOptions,
	libraryStatusQueryOptions,
} from "#/shared/domain/model/model.functions";
import type { CatalogQuery } from "#/shared/domain/model/schemas";
import { useDeleteModel, useModelDownload } from "#/shared/domain/model/use-model";

const DEFAULT_CATALOG_QUERY: CatalogQuery = {
	page: 0,
	pageSize: CATALOG_PAGE_SIZE,
	sortBy: DEFAULT_SORT.sortBy,
	sortDir: DEFAULT_SORT.sortDir,
	hiddenFits: ["wont-fit"],
};

const SKELETON_ROW_KEYS = ["a", "b", "c", "d", "e", "f"];

export const Route = createFileRoute("/_authenticated/library")({
	head: () => ({ meta: [{ title: "Library · localghost" }] }),
	loader: ({ context }) => {
		context.queryClient.prefetchQuery(hardwareQueryOptions());
		context.queryClient.prefetchQuery(libraryStatusQueryOptions());
		context.queryClient.prefetchQuery(catalogQueryOptions(DEFAULT_CATALOG_QUERY));
	},
	component: LibraryPage,
});

function LibraryPage() {
	const { data: hardware, isLoading: isLoadingHardware } = useQuery(hardwareQueryOptions());

	const { data: runtimeStatus, isPending: isStatusPending } = useQuery(libraryStatusQueryOptions());

	const { pulling, pull, stop } = useModelDownload(runtimeStatus?.endpointId ?? null);
	const deleteModel = useDeleteModel();

	const [isReconnecting, setIsReconnecting] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<string | null>(null);

	function handlePull(model: string) {
		if (!runtimeStatus?.found) return;
		pull(model);
	}

	return (
		<div className="h-full overflow-auto">
			<Container size="6xl" className="space-y-6 p-6">
				<HardwareCard hardware={hardware} isLoading={isLoadingHardware} />

				<Separator />

				{isStatusPending ? (
					<>
						<Item variant="muted">
							<ItemContent>
								<ItemTitle>
									<Skeleton className="h-4 w-40" />
								</ItemTitle>
								<ItemDescription>
									<Skeleton inline className="h-3.5 w-56" />
								</ItemDescription>
							</ItemContent>
						</Item>
						<ItemGroup className="grid grid-flow-row-dense grid-cols-[repeat(auto-fit,minmax(min(22rem,100%),1fr))]">
							{SKELETON_ROW_KEYS.map((key) => (
								<ModelListItem key={key} isLoading />
							))}
						</ItemGroup>
					</>
				) : runtimeStatus?.found ? (
					isReconnecting ? (
						<RemoteRuntimeForm onBack={() => setIsReconnecting(false)} />
					) : (
						<>
							<Item variant="muted">
								<ItemContent>
									<ItemTitle>Connected to llama.cpp</ItemTitle>
									<ItemDescription>{runtimeStatus.runtimeUrl}</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Button variant="outline" size="sm" onClick={() => setIsReconnecting(true)}>
										Use a different llama.cpp
									</Button>
								</ItemActions>
							</Item>
							<ModelList
								installedModels={runtimeStatus.installedModels}
								pulling={pulling}
								hardware={hardware}
								endpointId={runtimeStatus.endpointId}
								onPull={handlePull}
								onStop={stop}
								onDelete={(model) => setPendingDelete(model)}
							/>
						</>
					)
				) : (
					<RuntimeSetupCard />
				)}
			</Container>
			<AlertDialog
				open={pendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDelete(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this model?</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingDelete} will be removed from this machine. You'll need to download it again to
							use it.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={deleteModel.isPending}
							onClick={(event) => {
								event.preventDefault();
								if (pendingDelete && runtimeStatus?.found) {
									deleteModel.mutate(
										{
											endpointId: runtimeStatus.endpointId,
											model: pendingDelete,
										},
										{ onSuccess: () => setPendingDelete(null) },
									);
								}
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
