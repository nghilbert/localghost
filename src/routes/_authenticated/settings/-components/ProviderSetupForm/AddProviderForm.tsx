import { PlusIcon } from "lucide-react";
import { ProviderEndpointForm } from "#/routes/_authenticated/settings/-components/ProviderEndpointForm";
import {
	buildEndpointFormSchema,
	dbProviderFor,
	type ProviderDefinition,
} from "#/routes/_authenticated/settings/-lib/providers";
import { useEndpoints } from "#/shared/domain/endpoint/use-endpoints";

type AddProviderFormProps = {
	definition: ProviderDefinition;
	onCreated?: () => void;
};

export function AddProviderForm({ definition, onCreated }: AddProviderFormProps) {
	const { createEndpoint } = useEndpoints();

	const keyDescription = definition.keyConsoleUrl
		? `Get a key at ${definition.keyConsoleUrl.replace("https://", "")}. Stored encrypted.`
		: "Stored encrypted at rest.";

	return (
		<ProviderEndpointForm
			schema={buildEndpointFormSchema({ definition })}
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
			onSubmit={async ({ value, onSaved }) => {
				await createEndpoint.mutate(
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
				);
			}}
		/>
	);
}
