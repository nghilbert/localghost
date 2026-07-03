import { revalidateLogic } from "@tanstack/react-form";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Field } from "#/components/ui/field";
import { useEndpoints } from "#/features/endpoints/hooks/use-endpoints";
import {
	buildEndpointFormSchema,
	dbProviderFor,
	type ProviderDefinition,
} from "#/features/endpoints/lib/providers";
import { useAppForm } from "#/hooks/use-app-form";

type AddProviderFormProps = {
	definition: ProviderDefinition;
	onCreated?: () => void;
};

export function AddProviderForm({ definition, onCreated }: AddProviderFormProps) {
	const schema = buildEndpointFormSchema(definition);

	const { createEndpoint, testEndpoint } = useEndpoints();

	const form = useAppForm({
		defaultValues: {
			name: definition.defaultName,
			url: definition.defaultBaseUrl ?? definition.prefillBaseUrl ?? "",
			apiKey: "",
		},
		validators: { onDynamic: schema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createEndpoint.mutate(
				{
					name: value.name.trim(),
					url: value.url.trim(),
					apiKey: value.apiKey || undefined,
					provider: dbProviderFor(definition.id),
				},
				{
					onSuccess: () => {
						formApi.reset();
						testEndpoint.reset();
						onCreated?.();
					},
				},
			);
		},
	});

	function handleTest() {
		const parsed = schema.safeParse(form.state.values);
		if (!parsed.success) {
			form.validateAllFields("submit");
			return;
		}
		testEndpoint.reset();
		testEndpoint.mutate(
			{
				url: parsed.data.url.trim(),
				apiKey: parsed.data.apiKey || undefined,
			},
			{
				onSuccess: (result) => {
					if (result.ok) {
						toast.success(
							result.modelCount != null
								? `Connection works: ${result.modelCount} models available`
								: "Connection works",
						);
					}
				},
			},
		);
	}

	const keyDescription = definition.keyConsoleUrl
		? `Get a key at ${definition.keyConsoleUrl.replace("https://", "")}. Stored encrypted.`
		: "Stored encrypted at rest.";

	const urlField = (
		<form.AppField name="url">
			{(field) => (
				<field.InputField
					label="Base URL"
					placeholder={definition.prefillBaseUrl ?? "https://my-server:8000/v1"}
				/>
			)}
		</form.AppField>
	);

	return (
		<form.AppForm>
			<form.SubmitForm className="gap-3">
				<form.AppField name="name">{(field) => <field.InputField label="Name" />}</form.AppField>

				<form.AppField name="apiKey">
					{(field) => (
						<field.PasswordField
							label={definition.requiresApiKey ? "API key" : "API key (optional)"}
							placeholder={definition.keyPlaceholder ?? "sk-…"}
							description={keyDescription}
						/>
					)}
				</form.AppField>

				{definition.defaultBaseUrl === null ? (
					urlField
				) : (
					<Collapsible>
						<CollapsibleTrigger
							render={
								<Button type="button" variant="ghost" size="sm" className="text-muted-foreground" />
							}
						>
							<ChevronDownIcon />
							Advanced
						</CollapsibleTrigger>
						<CollapsibleContent className="pt-2">{urlField}</CollapsibleContent>
					</Collapsible>
				)}

				<form.FormError>
					{testEndpoint.data && !testEndpoint.data.ok ? testEndpoint.data.error : undefined}
				</form.FormError>

				<Field orientation="horizontal">
					<form.SubmitButton>
						<PlusIcon />
						Add provider endpoint
					</form.SubmitButton>
					<Button
						type="button"
						variant="outline"
						disabled={testEndpoint.isPending}
						onClick={handleTest}
					>
						Test connection
					</Button>
				</Field>
			</form.SubmitForm>
		</form.AppForm>
	);
}
