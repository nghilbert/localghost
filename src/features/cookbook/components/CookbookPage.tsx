import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "#/components/PageHeader";
import { Separator } from "#/components/ui/separator";
import { HardwareCard } from "#/features/cookbook/components/HardwareCard";
import { ModelTable } from "#/features/cookbook/components/ModelTable";
import { OllamaSetupCard } from "#/features/cookbook/components/OllamaSetupCard";
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
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Cookbook"
				description="Browse and install local models matched to your hardware."
			/>
			<div className="flex-1 overflow-auto">
				<div className="space-y-6 p-6">
					<HardwareCard hardware={hardware} isLoading={isLoadingHardware} />

					<Separator />

					{!isLoading && ollamaStatus && !ollamaStatus.reachable && (
						<OllamaSetupCard ollamaUrl={ollamaStatus.ollamaUrl} gpus={hardware?.gpus ?? null} />
					)}

					<ModelTable
						hardware={hardware}
						installedModels={ollamaStatus?.installedModels ?? []}
						pulling={pulling}
						onPull={handlePull}
						onDelete={(model) => deleteMutation.mutate(model)}
					/>
				</div>
			</div>
		</div>
	);
}
