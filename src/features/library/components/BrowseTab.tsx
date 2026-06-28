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
	hardwareQueryOptions,
	libraryStatusQueryOptions,
} from "#/features/library/lib/library.functions";

export function BrowseTab() {
	const { data: hardware, isLoading: isLoadingHardware } = useQuery(hardwareQueryOptions());

	const { data: ollamaStatus } = useQuery({
		...libraryStatusQueryOptions(),
		refetchInterval: (query) => (query.state.data?.found ? 30_000 : 5_000),
	});

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
							hardware={hardware}
							installedModels={ollamaStatus.installedModels}
							pulling={pulling}
							onPull={handlePull}
							onStop={stop}
						/>
						<ModelTable
							hardware={hardware}
							installedModels={ollamaStatus.installedModels}
							pulling={pulling}
							onPull={handlePull}
							onStop={stop}
							onDelete={(model) => deleteModel.mutate(model)}
						/>
					</>
				)
			) : (
				<OllamaSetupCard />
			)}
		</div>
	);
}
