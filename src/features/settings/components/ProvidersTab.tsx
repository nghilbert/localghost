import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { EndpointDialog } from "#/features/chat/components/EndpointDialog";
import { deleteEndpoint, endpointsQueryOptions } from "#/features/chat/lib/chat.functions";

export function ProvidersTab() {
	const queryClient = useQueryClient();
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteEndpoint({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
			toast.success("Endpoint removed");
		},
		onError: () => toast.error("Failed to remove endpoint"),
	});

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Configure LLM provider endpoints. API keys are encrypted at rest.
				</p>
				<EndpointDialog />
			</div>

			{endpoints.length === 0 && (
				<p className="py-8 text-center text-sm text-muted-foreground">
					No providers configured yet
				</p>
			)}

			<ul className="space-y-2">
				{endpoints.map((ep) => (
					<li key={ep.id} className="flex items-center gap-3 rounded-lg border p-3">
						<div className="min-w-0 flex-1">
							<div className="text-sm font-medium">{ep.name}</div>
							<div className="truncate text-xs text-muted-foreground">{ep.url}</div>
							<div className="text-xs text-muted-foreground">
								{ep.provider} {ep.hasApiKey ? "· API key set" : "· No API key"}
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="text-destructive hover:text-destructive"
							onClick={() => deleteMutation.mutate(ep.id)}
							disabled={deleteMutation.isPending}
						>
							Remove
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}
