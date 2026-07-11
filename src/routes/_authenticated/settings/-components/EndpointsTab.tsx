import { CheckCircle2Icon } from "lucide-react";
import { useEndpoints } from "#/entities/endpoint/use-endpoints";
import { EndpointItem } from "#/features/manage-endpoints/components/EndpointItem";
import { ProviderSetupForm } from "#/features/manage-endpoints/components/ProviderSetupForm";
import { OllamaEndpoint } from "#/features/pull-model/components/OllamaEndpoint";
import { Badge } from "#/shared/ui/badge";
import { FieldDescription, FieldLegend, FieldSet } from "#/shared/ui/field";
import { ItemGroup } from "#/shared/ui/item";

export function EndpointsTab() {
	const { endpoints, deleteEndpoint } = useEndpoints();
	// Ollama is the built-in endpoint, shown on its own panel, so keep it out of this list.
	const added = endpoints.filter((ep) => ep.provider !== "ollama");

	return (
		<div className="space-y-8">
			<OllamaEndpoint />
			<FieldSet>
				<FieldLegend className="flex items-center gap-2">
					Provider endpoints
					{added.length > 0 && (
						<Badge variant="secondary" className="bg-success/10 text-success">
							<CheckCircle2Icon />
							{added.length} added
						</Badge>
					)}
				</FieldLegend>
				<FieldDescription>
					Local Ollama is built in. Add a provider endpoint to use a hosted API (Anthropic, OpenAI,
					…) or any OpenAI-compatible server. Keys are encrypted at rest.
				</FieldDescription>
				{added.length > 0 && (
					<ItemGroup>
						{added.map((ep) => (
							<EndpointItem
								key={ep.id}
								endpoint={ep}
								onDelete={() => deleteEndpoint.mutate(ep.id)}
							/>
						))}
					</ItemGroup>
				)}
				<ProviderSetupForm />
			</FieldSet>
		</div>
	);
}
