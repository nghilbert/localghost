import { SaveIcon } from "lucide-react";
import {
	buildEndpointFormSchema,
	dbProviderFor,
	providerDefinitionFor,
} from "#/routes/_authenticated/settings/-lib/providers";
import type { listEndpoints } from "#/shared/domain/endpoint/endpoint.functions";
import { useUpdateEndpoint } from "#/shared/domain/endpoint/use-endpoints";
import { ProviderEndpointForm } from "./ProviderEndpointForm";

type Endpoint = Awaited<ReturnType<typeof listEndpoints>>[number];

/**
 * Inline editor for a saved endpoint's name, URL, and API key. A blank key
 * keeps the existing one; the provider (protocol) stays fixed. `onDone` fires
 * on save or cancel so the parent can collapse back to the read-only row.
 */
export function EditEndpointForm({ endpoint, onDone }: { endpoint: Endpoint; onDone: () => void }) {
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
