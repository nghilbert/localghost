import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "#/components/ui/item";
import {
	ollamaInstallQueryOptions,
	startOllama,
	stopOllama,
} from "#/features/cookbook/lib/install.functions";

/**
 * Admin-only start/stop controls for the app-managed Ollama docker container.
 * Renders nothing when there is no managed container to control.
 */
export function OllamaContainerControls() {
	const queryClient = useQueryClient();
	const { data: installInfo } = useQuery(ollamaInstallQueryOptions());

	function invalidate() {
		queryClient.invalidateQueries({ queryKey: ["ollama-install"] });
		queryClient.invalidateQueries({ queryKey: ["cookbook-status"] });
	}

	const startMutation = useMutation({
		mutationFn: () => startOllama(),
		onSuccess: () => {
			toast.success("Ollama container started");
			invalidate();
		},
		onError: (error) => toast.error("Failed to start Ollama", { description: error.message }),
	});

	const stopMutation = useMutation({
		mutationFn: () => stopOllama(),
		onSuccess: () => {
			toast.success("Ollama container stopped");
			invalidate();
		},
		onError: (error) => toast.error("Failed to stop Ollama", { description: error.message }),
	});

	if (!installInfo?.isAdmin || installInfo.containerStatus === "absent") return null;

	const isRunning = installInfo.containerStatus === "running";

	return (
		<Item variant="outline">
			<ItemContent>
				<ItemTitle>
					Ollama container
					<Badge
						variant="secondary"
						className={isRunning ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}
					>
						{isRunning ? "Running" : "Stopped"}
					</Badge>
				</ItemTitle>
				<ItemDescription>Managed by the app through Docker.</ItemDescription>
			</ItemContent>
			<ItemActions>
				{isRunning ? (
					<Button
						variant="outline"
						size="sm"
						disabled={stopMutation.isPending}
						onClick={() => stopMutation.mutate()}
					>
						Stop
					</Button>
				) : (
					<Button
						size="sm"
						disabled={startMutation.isPending}
						onClick={() => startMutation.mutate()}
					>
						Start
					</Button>
				)}
			</ItemActions>
		</Item>
	);
}
