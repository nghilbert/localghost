import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmDeleteDialog } from "#/components/layout/ConfirmDeleteDialog";
import { Page } from "#/components/layout/Page";
import { Item } from "#/components/ui/item";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { useDeleteModel } from "#/features/library/hooks/use-delete-model";
import { useModelDownload } from "#/features/library/hooks/use-model-download";
import { libraryQueries } from "#/features/library/library.queries";
import { HardwareCard } from "./HardwareCard";
import { LlamacppSettingsLink } from "./LlamacppSettingsLink";
import { ModelList, ModelListSkeleton } from "./ModelList";
import { RuntimeSetupCard } from "./RuntimeSetupCard";

/** The Library page: hardware, the llama.cpp connection, and the model list. */
export function Library() {
	const { data: hardware, isLoading: isLoadingHardware } = useQuery(libraryQueries.hardware());

	const { data: runtimeStatus, isPending: isStatusPending } = useQuery(
		libraryQueries.runtimeStatus(),
	);

	const { pulling, pull, stop } = useModelDownload();
	const deleteModel = useDeleteModel();

	const [pendingDelete, setPendingDelete] = useState<string | null>(null);

	function handlePull(model: string) {
		if (!runtimeStatus?.found) return;
		pull(model);
	}

	return (
		<ScrollArea.Root className="h-full">
			<ScrollArea.Viewport>
				<Page size="xl">
					<HardwareCard hardware={hardware} isLoading={isLoadingHardware} />

					<Separator />

					{isStatusPending ? (
						<>
							<Item.Root variant="soft">
								<Item.Content>
									<Item.Title>
										<Skeleton className="h-4 w-40" />
									</Item.Title>
									<Item.Description>
										<Skeleton render={<span />} className="inline-block h-3.5 w-56" />
									</Item.Description>
								</Item.Content>
							</Item.Root>
							<ModelListSkeleton />
						</>
					) : runtimeStatus?.found ? (
						<>
							<Item.Root variant="soft">
								<Item.Content>
									<Item.Title>Connected to llama.cpp</Item.Title>
									<Item.Description>{runtimeStatus.runtimeUrl}</Item.Description>
								</Item.Content>
								<Item.Actions>
									<LlamacppSettingsLink color="neutral" variant="outlined" size="sm">
										Change in Settings
									</LlamacppSettingsLink>
								</Item.Actions>
							</Item.Root>
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
					) : (
						<RuntimeSetupCard />
					)}
				</Page>
			</ScrollArea.Viewport>
			<ScrollArea.Scrollbar />
			<ConfirmDeleteDialog
				open={pendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDelete(null);
				}}
				title="Delete this model?"
				description={`${pendingDelete} will be removed from this machine. You'll need to download it again to use it.`}
				isPending={deleteModel.isPending}
				onConfirm={() => {
					if (pendingDelete && runtimeStatus?.found) {
						deleteModel.mutate(
							{ endpointId: runtimeStatus.endpointId, model: pendingDelete },
							{ onSuccess: () => setPendingDelete(null) },
						);
					}
				}}
			/>
		</ScrollArea.Root>
	);
}
