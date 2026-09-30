import { PlusIcon } from "lucide-react";
import { ProviderEndpointForm } from "#/features/endpoint/components/ProviderEndpointForm";
import { useCreateEndpoint } from "#/features/endpoint/hooks/use-create-endpoint";
import {
	buildEndpointFormSchema,
	dbProviderFor,
	type ProviderDefinition,
} from "#/features/endpoint/lib/providers";

type AddProviderFormProps = {
	definition: ProviderDefinition;
	onCreated?: () => void;
};

/** The fields for adding one kind of provider. */
export function AddProviderForm({ definition, onCreated }: AddProviderFormProps) {
	const createEndpoint = useCreateEndpoint();

	const keyDescription = definition.keyConsoleUrl
		? `Get a key at ${definition.keyConsoleUrl.replace("https://", "")}. Stored encrypted.`
		: "Stored encrypted at rest.";

	return (
		<ProviderEndpointForm
			schema={buildEndpointFormSchema({ definition })}
			provider={dbProviderFor(definition.id)}
			defaultValues={{
				name: definition.defaultName,
				url: definition.defaultBaseUrl ?? definition.prefillBaseUrl ?? "",
				apiKey: "",
			}}
			keyLabel={definition.requiresApiKey ? "API key" : "API key (optional)"}
			keyPlaceholder={definition.keyPlaceholder}
			keyDescription={keyDescription}
			urlPlaceholder={definition.prefillBaseUrl ?? "https://my-server:8000/v1"}
			collapseUrl={definition.defaultBaseUrl !== null}
			submitIcon={<PlusIcon />}
			submitLabel="Add provider endpoint"
			onSubmit={({ value, onSaved }) =>
				createEndpoint.mutateAsync(
					{
						name: value.name,
						url: value.url,
						apiKey: value.apiKey || undefined,
						provider: dbProviderFor(definition.id),
					},
					{
						onSuccess: () => {
							onSaved();
							onCreated?.();
						},
					},
				)
			}
		/>
	);
}
