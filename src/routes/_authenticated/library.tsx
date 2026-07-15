import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CircleAlertIcon } from "lucide-react";
import { useState } from "react";
import { HardwareCard } from "#/routes/_authenticated/library/-components/HardwareCard";
import { ModelTable } from "#/routes/_authenticated/library/-components/ModelTable";
import { OllamaSetupCard } from "#/routes/_authenticated/library/-components/OllamaSetupCard";
import { RemoteOllamaForm } from "#/routes/_authenticated/library/-components/RemoteOllamaForm";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/shared/components/ui/alert";
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
import { useModelPull } from "#/shared/domain/model/use-model-pull";
import { useOllama } from "#/shared/domain/model/use-ollama";

export const Route = createFileRoute("/_authenticated/library")({
	head: () => ({ meta: [{ title: "Library · localghost" }] }),
	loader: ({ context }) => {
		context.queryClient.prefetchQuery(hardwareQueryOptions());
		context.queryClient.prefetchQuery(libraryStatusQueryOptions());
		context.queryClient.prefetchQuery(catalogQueryOptions());
	},
	component: LibraryPage,
});

function LibraryPage() {
	const { data: hardware, isLoading: isLoadingHardware } = useQuery(hardwareQueryOptions());

	const { data: ollamaStatus, isPending: isStatusPending } = useQuery(libraryStatusQueryOptions());

	const {
		data: catalog = [],
		isPending: isCatalogPending,
		isError: isCatalogError,
		refetch: refetchCatalog,
	} = useQuery(catalogQueryOptions());

	const { pulling, pull, stop, dismiss } = useModelPull();
	const { deleteModel } = useOllama();

	const [isReconnecting, setIsReconnecting] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<string | null>(null);

	function handlePull(model: string) {
		if (!ollamaStatus?.found) return;
		pull({ model, ollamaUrl: ollamaStatus.ollamaUrl });
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
				) : ollamaStatus?.found ? (
					isReconnecting ? (
						<RemoteOllamaForm onBack={() => setIsReconnecting(false)} />
					) : (
						<>
							<Item variant="muted">
								<ItemContent>
									<ItemTitle>Connected to Ollama</ItemTitle>
									<ItemDescription>{ollamaStatus.ollamaUrl}</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Button variant="outline" size="sm" onClick={() => setIsReconnecting(true)}>
										Use a different Ollama
									</Button>
								</ItemActions>
							</Item>
							{isCatalogError && (
								<Alert variant="destructive">
									<CircleAlertIcon />
									<AlertTitle>Couldn't load the model catalog</AlertTitle>
									<AlertDescription>
										ollama.com didn't respond, so only installed models are listed. Check your
										connection and try again.
									</AlertDescription>
									<AlertAction>
										<Button size="sm" variant="outline" onClick={() => refetchCatalog()}>
											Try again
										</Button>
									</AlertAction>
								</Alert>
							)}
							{isCatalogPending ? (
								<Skeleton className="h-72 w-full" />
							) : (
								<ModelTable
									catalog={catalog}
									installedModels={ollamaStatus.installedModels}
									pulling={pulling}
									hardware={hardware}
									endpointId={ollamaStatus.endpointId}
									onPull={handlePull}
									onStop={stop}
									onDismiss={dismiss}
									onDelete={(model) => setPendingDelete(model)}
								/>
							)}
						</>
					)
				) : (
					<OllamaSetupCard />
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
								if (pendingDelete) deleteModel.mutate(pendingDelete);
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
