import { CheckCircle2Icon } from "lucide-react";
import { EndpointItem } from "#/routes/_authenticated/settings/-components/endpoints/EndpointItem";
import { ProviderSetupForm } from "#/routes/_authenticated/settings/-components/endpoints/ProviderSetupForm";
import { Badge } from "#/shared/components/ui/badge";
import { FieldDescription, FieldLegend, FieldSet } from "#/shared/components/ui/field";
import { ItemGroup } from "#/shared/components/ui/item";
import { useEndpoints } from "#/shared/domain/endpoint/use-endpoints";
import { LocalOllamaForm } from "#/shared/domain/model/LocalOllamaForm";

export function EndpointsTab() {
	const { endpoints, deleteEndpoint } = useEndpoints();
	// Ollama is the built-in endpoint, shown on its own panel, so keep it out of this list.
	const added = endpoints.filter((ep) => ep.provider !== "ollama");

	return (
		<div className="space-y-8">
			<LocalOllamaForm />
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
