import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { FieldDescription, FieldLegend, FieldSet } from "#/components/ui/field";
import { ItemGroup } from "#/components/ui/item";
import { EndpointItem } from "#/features/endpoints/components/EndpointItem";
import { ProviderSetupForm } from "#/features/endpoints/components/ProviderSetupForm";
import { useEndpoints } from "#/features/endpoints/hooks/use-endpoints";

export function ProvidersTab() {
	const { endpoints, deleteEndpoint } = useEndpoints();

	return (
		<FieldSet>
			<FieldLegend className="flex items-center gap-2">
				LLM providers
				{endpoints.length > 0 ? (
					<Badge variant="secondary" className="bg-success/10 text-success">
						<CheckCircle2Icon />
						{endpoints.length} configured
					</Badge>
				) : (
					<Badge variant="secondary" className="bg-warning/10 text-warning">
						<CircleAlertIcon />
						None configured
					</Badge>
				)}
			</FieldLegend>
			<FieldDescription>
				Required for chat. Local Ollama or any hosted API; keys are encrypted at rest.
			</FieldDescription>
			{endpoints.length > 0 && (
				<ItemGroup>
					{endpoints.map((ep) => (
						<EndpointItem key={ep.id} endpoint={ep} onDelete={() => deleteEndpoint.mutate(ep.id)} />
					))}
				</ItemGroup>
			)}
			<ProviderSetupForm />
		</FieldSet>
	);
}
