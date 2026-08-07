import { CheckCircle2Icon } from "lucide-react";
import { Badge } from "#/shared/components/ui/badge";
import { FieldDescription, FieldLegend, FieldSet } from "#/shared/components/ui/field";
import { ItemGroup } from "#/shared/components/ui/item";
import { useDeleteEndpoint, useEndpointQuery } from "#/shared/domain/endpoint/use-endpoints";
import { EndpointItem } from "./EndpointItem";
import { LocalRuntimeForm } from "./LocalRuntimeForm";
import { ProviderSetupForm } from "./ProviderSetupForm";

export function EndpointsTab() {
	const endpoints = useEndpointQuery();
	const deleteEndpoint = useDeleteEndpoint();
	// llama.cpp is the built-in endpoint, shown on its own panel, so keep it out of this list.
	const added = endpoints.filter((ep) => ep.provider !== "llamacpp");

	return (
		<div className="space-y-8">
			<LocalRuntimeForm />
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
					Local llama.cpp is built in. Add a provider endpoint to use a hosted API (Anthropic,
					OpenAI, …) or any OpenAI-compatible server. Keys are encrypted at rest.
				</FieldDescription>
				{added.length > 0 && (
					<ItemGroup>
						{added.map((ep) => (
							<EndpointItem
								key={ep.id}
								endpoint={ep}
								isDeleting={deleteEndpoint.isPending}
								onDelete={(onSuccess) => deleteEndpoint.mutate(ep.id, { onSuccess })}
							/>
						))}
					</ItemGroup>
				)}
				<ProviderSetupForm />
			</FieldSet>
		</div>
	);
}
