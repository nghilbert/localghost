import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "#/components/ui/item";
import { Separator } from "#/components/ui/separator";
import { HardwareCard } from "#/features/cookbook/components/HardwareCard";
import { ModelTable } from "#/features/cookbook/components/ModelTable";
import { OllamaSetupCard } from "#/features/cookbook/components/OllamaSetupCard";
import { RecommendedModels } from "#/features/cookbook/components/RecommendedModels";
import { RemoteOllamaForm } from "#/features/cookbook/components/RemoteOllamaForm";
import { useModelPull } from "#/features/cookbook/hooks/use-model-pull";
import {
	cookbookStatusQueryOptions,
	deleteModel,
	hardwareQueryOptions,
} from "#/features/cookbook/lib/cookbook.functions";

export function BrowseTab() {
	const queryClient = useQueryClient();

	const { data: hardware, isLoading: isLoadingHardware } = useQuery(hardwareQueryOptions());

	const { data: ollamaStatus } = useQuery({
		...cookbookStatusQueryOptions(),
		refetchInterval: (query) => (query.state.data?.found ? 30_000 : 5_000),
	});

	const { pulling, pull } = useModelPull();

	const [isReconnecting, setIsReconnecting] = useState(false);

	const deleteMutation = useMutation({
		mutationFn: (model: string) => deleteModel({ data: { model } }),
		onSuccess: (_data, model) => {
			queryClient.invalidateQueries({ queryKey: ["cookbook-status"] });
			toast.success(`${model} deleted`);
		},
		onError: (error) => toast.error("Failed to delete model", { description: error.message }),
	});

	function handlePull(model: string) {
		if (!ollamaStatus?.found) return;
		pull(model, ollamaStatus.ollamaUrl);
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
						/>
						<ModelTable
							hardware={hardware}
							installedModels={ollamaStatus.installedModels}
							pulling={pulling}
							onPull={handlePull}
							onDelete={(model) => deleteMutation.mutate(model)}
						/>
					</>
				)
			) : (
				<OllamaSetupCard />
			)}
		</div>
	);
}
