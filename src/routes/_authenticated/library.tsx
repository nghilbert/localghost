import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HardwareCard } from "#/routes/_authenticated/library/-components/HardwareCard";
import { ModelList } from "#/routes/_authenticated/library/-components/ModelList";
import { RemoteRuntimeForm } from "#/routes/_authenticated/library/-components/RemoteRuntimeForm";
import { RuntimeSetupCard } from "#/routes/_authenticated/library/-components/RuntimeSetupCard";
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
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemTitle,
} from "#/shared/components/ui/item";
import { Separator } from "#/shared/components/ui/separator";
import { Skeleton } from "#/shared/components/ui/skeleton";
import {
	catalogQueryOptions,
	hardwareQueryOptions,
	libraryStatusQueryOptions,
} from "#/shared/domain/model/model.functions";
import { useModelDownload } from "#/shared/domain/model/use-model-download";
import { useRuntime } from "#/shared/domain/model/use-runtime";

const DEFAULT_CATALOG_QUERY = {
	page: 0,
	pageSize: 25,
	sortBy: "pullCount",
	sortDir: "desc",
} as const;

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
	const { deleteModel } = useRuntime();

	const [isReconnecting, setIsReconnecting] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<string | null>(null);

	function handlePull(model: string) {
		if (!runtimeStatus?.found) return;
		pull(model);
	}

	return (
		<div className="h-full overflow-auto">
			<div className="space-y-6 p-6">
				<HardwareCard hardware={hardware} isLoading={isLoadingHardware} />

				<Separator />

				{isStatusPending ? (
					<div className="space-y-6">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-72 w-full" />
					</div>
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
			</div>
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
							onClick={() => {
								if (pendingDelete && runtimeStatus?.found) {
									deleteModel.mutate({
										endpointId: runtimeStatus.endpointId,
										model: pendingDelete,
									});
								}
								setPendingDelete(null);
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
