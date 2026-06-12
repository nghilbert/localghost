import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CircleAlertIcon } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { HardwareCard } from "#/features/cookbook/components/HardwareCard";
import { ModelTable } from "#/features/cookbook/components/ModelTable";
import { useModelPull } from "#/features/cookbook/hooks/use-model-pull";
import {
	cookbookStatusQueryOptions,
	deleteModel,
	hardwareQueryOptions,
} from "#/features/cookbook/lib/cookbook.functions";

export function CookbookPage() {
	const queryClient = useQueryClient();

	const { data: hardware, isLoading: isLoadingHardware } = useQuery(hardwareQueryOptions());

	const { data: ollamaStatus, isLoading: isLoadingStatus } = useQuery({
		...cookbookStatusQueryOptions(),
		refetchInterval: 30_000,
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

					{!isLoading && ollamaStatus && !ollamaStatus.found && (
						<Alert>
							<CircleAlertIcon className="text-warning" />
							<AlertTitle>Ollama not found</AlertTitle>
							<AlertDescription className="flex flex-col gap-2">
								No running Ollama instance was detected on this machine.
								<Button variant="outline" size="sm" className="w-fit" asChild>
									<Link to="/settings" search={{ tab: "setup" }}>
										Set up Ollama
									</Link>
								</Button>
							</AlertDescription>
						</Alert>
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
