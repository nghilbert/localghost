import { SaveIcon } from "lucide-react";
import type { ClientEndpoint } from "#/features/endpoint/endpoint.types";
import { useUpdateEndpoint } from "#/features/endpoint/hooks/use-update-endpoint";
import {
	buildEndpointFormSchema,
	dbProviderFor,
	providerDefinitionFor,
} from "#/features/endpoint/lib/providers";
import { ProviderEndpointForm } from "./ProviderEndpointForm";

/** Edits a saved endpoint's name, URL, and key. A blank key keeps the current one. */
export function EditEndpointForm({
	endpoint,
	onDone,
}: {
	endpoint: ClientEndpoint;
	onDone: () => void;
}) {
	const updateEndpoint = useUpdateEndpoint();
	const definition = providerDefinitionFor(endpoint.provider);

	return (
		<ProviderEndpointForm
			schema={buildEndpointFormSchema({ definition, requireApiKey: false })}
			provider={dbProviderFor(definition.id)}
			defaultValues={{ name: endpoint.name, url: endpoint.url, apiKey: "" }}
			keyLabel={endpoint.hasApiKey ? "API key (leave blank to keep current)" : "API key (optional)"}
			keyPlaceholder={definition.keyPlaceholder}
			keyDescription="Stored encrypted at rest."
			urlPlaceholder={endpoint.url}
			collapseUrl={false}
			submitIcon={<SaveIcon />}
			submitLabel="Save changes"
			onCancel={onDone}
			onSubmit={({ value, onSaved }) =>
				updateEndpoint.mutateAsync(
					{
						id: endpoint.id,
						data: {
							name: value.name,
							url: value.url,
							...(value.apiKey && { apiKey: value.apiKey }),
						},
					},
					{
						onSuccess: () => {
							onSaved();
							onDone();
						},
					},
				)
			}
		/>
	);
}
