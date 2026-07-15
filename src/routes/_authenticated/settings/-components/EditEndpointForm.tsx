import { SaveIcon } from "lucide-react";
import { ProviderEndpointForm } from "#/routes/_authenticated/settings/-components/ProviderEndpointForm";
import {
	buildEndpointFormSchema,
	providerDefinitionFor,
} from "#/routes/_authenticated/settings/-lib/providers";
import type { listEndpoints } from "#/shared/domain/endpoint/endpoint.functions";
import { useEndpoints } from "#/shared/domain/endpoint/use-endpoints";

type Endpoint = Awaited<ReturnType<typeof listEndpoints>>[number];

/**
 * Inline editor for a saved endpoint's name, URL, and API key. A blank key
 * keeps the existing one; the provider (protocol) stays fixed. `onDone` fires
 * on save or cancel so the parent can collapse back to the read-only row.
 */
export function EditEndpointForm({ endpoint, onDone }: { endpoint: Endpoint; onDone: () => void }) {
	const { updateEndpoint } = useEndpoints();
	const definition = providerDefinitionFor(endpoint.provider);

	return (
		<ProviderEndpointForm
			schema={buildEndpointFormSchema({ definition, requireApiKey: false })}
			defaultValues={{ name: endpoint.name, url: endpoint.url, apiKey: "" }}
			keyLabel={endpoint.hasApiKey ? "API key (leave blank to keep current)" : "API key (optional)"}
			keyPlaceholder={definition.keyPlaceholder}
			keyDescription="Stored encrypted at rest."
			urlPlaceholder={endpoint.url}
			collapseUrl={false}
			submitIcon={<SaveIcon />}
			submitLabel="Save changes"
			onCancel={onDone}
			onSubmit={async ({ value, onSaved }) => {
				await updateEndpoint.mutate(
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
				);
			}}
		/>
	);
}
