import { Button } from "#/components/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/components/ui/item";
import { EndpointDialog } from "#/features/endpoints/components/EndpointDialog";
import { useEndpoints } from "#/features/endpoints/hooks/use-endpoints";

export function ProvidersTab() {
	const { endpoints, deleteEndpoint } = useEndpoints();

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

			{endpoints.length > 0 && (
				<ItemGroup>
					{endpoints.map((ep) => (
						<Item key={ep.id} variant="outline">
							<ItemContent>
								<ItemTitle>{ep.name}</ItemTitle>
								<ItemDescription>{ep.url}</ItemDescription>
								<ItemDescription>
									{ep.provider} {ep.hasApiKey ? "· API key set" : "· No API key"}
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<Button
									variant="ghost"
									size="sm"
									className="text-destructive hover:text-destructive"
									onClick={() => deleteEndpoint.mutate(ep.id)}
									disabled={deleteEndpoint.isPending}
								>
									Remove
								</Button>
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			)}
		</div>
	);
}
