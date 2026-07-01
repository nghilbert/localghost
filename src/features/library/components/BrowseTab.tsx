import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "#/components/ui/item";
import { Separator } from "#/components/ui/separator";
import { HardwareCard } from "#/features/library/components/HardwareCard";
import { ModelTable } from "#/features/library/components/ModelTable";
import { OllamaSetupCard } from "#/features/library/components/OllamaSetupCard";
import { RecommendedModels } from "#/features/library/components/RecommendedModels";
import { RemoteOllamaForm } from "#/features/library/components/RemoteOllamaForm";
import { useModelPull } from "#/features/library/hooks/use-model-pull";
import { useOllama } from "#/features/library/hooks/use-ollama";
import {
	catalogQueryOptions,
	hardwareQueryOptions,
	libraryStatusQueryOptions,
} from "#/features/library/lib/library.functions";

export function BrowseTab() {
	const { data: hardware, isLoading: isLoadingHardware } = useQuery(hardwareQueryOptions());

	const { data: ollamaStatus } = useQuery(libraryStatusQueryOptions());

	const { data: catalog = [] } = useQuery(catalogQueryOptions());

	const { pulling, pull, stop } = useModelPull();
	const { deleteModel } = useOllama();

	const [isReconnecting, setIsReconnecting] = useState(false);

	function handlePull(model: string) {
		if (!ollamaStatus?.found) return;
		pull({ model, ollamaUrl: ollamaStatus.ollamaUrl });
	}

	return (
		<div className="space-y-6 p-6">
			<HardwareCard hardware={hardware} isLoading={isLoadingHardware} />

			<Separator />

			{ollamaStatus?.found ? (
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
						<RecommendedModels
							catalog={catalog}
							hardware={hardware}
							installedModels={ollamaStatus.installedModels}
							pulling={pulling}
							onPull={handlePull}
							onStop={stop}
						/>
						<ModelTable
							catalog={catalog}
							hardware={hardware}
							installedModels={ollamaStatus.installedModels}
							pulling={pulling}
							onPull={handlePull}
							onStop={stop}
							onDelete={(model) => deleteModel.mutate(model)}
							initialColumnVisibility={{ family: false, size: false }}
						/>
					</>
				)
			) : (
				<OllamaSetupCard />
			)}
		</div>
	);
}
