import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "#/components/ui/item";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { HardwareCard } from "#/features/library/components/HardwareCard";
import { ModelTable } from "#/features/library/components/ModelTable";
import { OllamaSetupCard } from "#/features/library/components/OllamaSetupCard";
import { RecommendedModel } from "#/features/library/components/RecommendedModel";
import { RemoteOllamaForm } from "#/features/library/components/RemoteOllamaForm";
import { useModelPull } from "#/features/library/hooks/use-model-pull";
import { useOllama } from "#/features/library/hooks/use-ollama";
import {
	catalogQueryOptions,
	hardwareQueryOptions,
	libraryStatusQueryOptions,
} from "#/features/library/lib/library.functions";

export function LibraryPage() {
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
								<>
									<RecommendedModel
										catalog={catalog}
										installedModels={ollamaStatus.installedModels}
										pulling={pulling}
										onPull={handlePull}
										onStop={stop}
										onDismiss={dismiss}
									/>
									<ModelTable
										catalog={catalog}
										installedModels={ollamaStatus.installedModels}
										pulling={pulling}
										onPull={handlePull}
										onStop={stop}
										onDismiss={dismiss}
										onDelete={(model) => setPendingDelete(model)}
									/>
								</>
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
