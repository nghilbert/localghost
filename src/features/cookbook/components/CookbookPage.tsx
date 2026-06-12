import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "#/components/PageHeader";
import { Separator } from "#/components/ui/separator";
import { HardwareCard } from "#/features/cookbook/components/HardwareCard";
import { ModelTable } from "#/features/cookbook/components/ModelTable";
import { OllamaSetupFlow } from "#/features/cookbook/components/OllamaSetupFlow";
import { RecommendedModels } from "#/features/cookbook/components/RecommendedModels";
import { useModelPull } from "#/features/cookbook/hooks/use-model-pull";
import {
	cookbookStatusQueryOptions,
	deleteModel,
	hardwareQueryOptions,
} from "#/features/cookbook/lib/cookbook.functions";

export function CookbookPage() {
	const queryClient = useQueryClient();

	const { data: hardware, isLoading: isLoadingHardware } = useQuery(hardwareQueryOptions());

	const { data: ollamaStatus } = useQuery({
		...cookbookStatusQueryOptions(),
		refetchInterval: (query) => (query.state.data?.found ? 30_000 : 5_000),
	});

	const { pulling, pull } = useModelPull();

	const deleteMutation = useMutation({
		mutationFn: (model: string) => deleteModel({ data: { model } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cookbook-status"] }),
	});

	function handlePull(model: string) {
		if (!ollamaStatus?.found) return;
		pull(model, ollamaStatus.ollamaUrl);
	}

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

					{ollamaStatus?.found ? (
						<>
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
					) : (
						<OllamaSetupFlow />
					)}
				</div>
			</div>
		</div>
	);
}
