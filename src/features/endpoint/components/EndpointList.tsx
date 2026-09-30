import { useQuery } from "@tanstack/react-query";
import { SettingsSection } from "#/components/layout/SettingsSection";
import { Badge } from "#/components/ui/badge";
import { Item } from "#/components/ui/item";
import { endpointQueries } from "#/features/endpoint/endpoint.queries";
import { useDeleteEndpoint } from "#/features/endpoint/hooks/use-delete-endpoint";
import { EndpointItem } from "./EndpointItem";
import { ProviderSetupForm } from "./ProviderSetupForm";

/** The added provider endpoints, with a form to add another. llama.cpp is managed in its own section. */
export function EndpointList() {
	const { data: endpoints = [] } = useQuery(endpointQueries.list());
	const deleteEndpoint = useDeleteEndpoint();
	const added = endpoints.filter((ep) => ep.provider !== "llamacpp");

	return (
		<SettingsSection
			title={
				<>
					Provider endpoints
					{added.length > 0 && <Badge>{added.length}</Badge>}
				</>
			}
			description="Local llama.cpp is built in. Add a provider endpoint to use a hosted API (Anthropic, OpenAI, ...) or any OpenAI-compatible server. Keys are encrypted at rest."
		>
			{added.length > 0 && (
				<Item.Group render={<ul />}>
					{added.map((ep) => (
						<EndpointItem
							key={ep.id}
							endpoint={ep}
							isDeleting={deleteEndpoint.isPending}
							onDelete={(onSuccess) => deleteEndpoint.mutate(ep.id, { onSuccess })}
						/>
					))}
				</Item.Group>
			)}
			<ProviderSetupForm />
		</SettingsSection>
	);
}
