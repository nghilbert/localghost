import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, ChefHatIcon, ExternalLinkIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { HardwareCard } from "#/features/cookbook/components/HardwareCard";
import { ModelTable } from "#/features/cookbook/components/ModelTable";
import { useModelPull } from "#/features/cookbook/hooks/use-model-pull";
import {
	deleteModel,
	getHardware,
	getOllamaStatus,
} from "#/features/cookbook/lib/cookbook.functions";

export function CookbookPage() {
	const queryClient = useQueryClient();

	const { data: hardware, isLoading: isLoadingHardware } = useQuery({
		queryKey: ["cookbook-hardware"],
		queryFn: () => getHardware(),
		staleTime: 60_000,
	});

	const { data: ollamaStatus, isLoading: isLoadingStatus } = useQuery({
		queryKey: ["cookbook-status"],
		queryFn: () => getOllamaStatus(),
		refetchInterval: 30_000,
	});

	const { pulling, pull } = useModelPull();

	const deleteMutation = useMutation({
		mutationFn: (model: string) => deleteModel({ data: { model } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cookbook-status"] }),
	});

	function handlePull(model: string) {
		if (!ollamaStatus?.ollamaUrl) return;
		pull(model, ollamaStatus.ollamaUrl);
	}

	const isLoading = isLoadingHardware || isLoadingStatus;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center gap-2">
				<ChefHatIcon size={20} className="text-muted-foreground" />
				<div>
					<h1 className="text-lg font-semibold">Cookbook</h1>
					<p className="text-xs text-muted-foreground">
						Browse and install local models matched to your hardware.
					</p>
				</div>
			</div>

			{/* Hardware summary */}
			<HardwareCard hardware={hardware} isLoading={isLoadingHardware} />

			<Separator />

			{/* Ollama not reachable */}
			{!isLoading && ollamaStatus && !ollamaStatus.reachable && (
				<Alert>
					<AlertCircleIcon size={15} />
					<AlertTitle>Ollama not reachable</AlertTitle>
					<AlertDescription className="flex items-center gap-2">
						<span>
							Cannot connect to Ollama at <code className="text-xs">{ollamaStatus.ollamaUrl}</code>.
							Make sure Ollama is running.
						</span>
						<Button variant="outline" size="sm" className="ml-auto shrink-0 gap-1 text-xs" asChild>
							<a href="https://ollama.com" target="_blank" rel="noopener noreferrer">
								<ExternalLinkIcon size={11} />
								Get Ollama
							</a>
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{/* Model table */}
			<ModelTable
				hardware={hardware}
				installedModels={ollamaStatus?.installedModels ?? []}
				pulling={pulling}
				onPull={handlePull}
				onDelete={(model) => deleteMutation.mutate(model)}
			/>
		</div>
	);
}
