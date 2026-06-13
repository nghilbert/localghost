import { revalidateLogic } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { ConnectionTestAlert } from "#/components/ConnectionTestAlert";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Field, FieldGroup } from "#/components/ui/field";
import { useCreateEndpoint } from "#/features/chat/hooks/use-create-endpoint";
import { testEndpoint } from "#/features/chat/lib/chat.functions";
import {
	buildEndpointFormSchema,
	dbProviderFor,
	type ProviderDefinition,
} from "#/features/chat/lib/providers";
import { useAppForm } from "#/hooks/use-app-form";

type AddProviderFormProps = {
	definition: ProviderDefinition;
	onCreated?: () => void;
};

export function AddProviderForm({ definition, onCreated }: AddProviderFormProps) {
	const schema = buildEndpointFormSchema(definition);

	const testMutation = useMutation({
		mutationFn: (data: { url: string; apiKey?: string }) => testEndpoint({ data }),
	});

	const createMutation = useCreateEndpoint();

	const form = useAppForm({
		defaultValues: {
			name: definition.defaultName,
			url: definition.defaultBaseUrl ?? definition.prefillBaseUrl ?? "",
			apiKey: "",
		},
		validators: { onDynamic: schema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createMutation.mutate(
				{
					name: value.name.trim(),
					url: value.url.trim(),
					apiKey: value.apiKey || undefined,
					provider: dbProviderFor(definition.id),
				},
				{
					onSuccess: () => {
						formApi.reset();
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
		testMutation.mutate({
			url: parsed.data.url.trim(),
			apiKey: parsed.data.apiKey || undefined,
		});
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
		<form
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.AppForm>
				<FieldGroup className="gap-3">
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
							<CollapsibleTrigger asChild>
								<Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
									<ChevronDownIcon />
									Advanced
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="pt-2">{urlField}</CollapsibleContent>
						</Collapsible>
					)}

					{testMutation.data && (
						<ConnectionTestAlert
							ok={testMutation.data.ok}
							title={testMutation.data.ok ? "Connection works" : "Connection failed"}
							description={
								testMutation.data.ok
									? `${testMutation.data.modelCount} models available.`
									: (testMutation.data.error ?? "Request failed")
							}
						/>
					)}
					<form.FormError>{createMutation.error?.message}</form.FormError>

					<Field orientation="horizontal">
						<form.SubmitButton>
							<PlusIcon />
							Add provider
						</form.SubmitButton>
						<Button
							type="button"
							variant="outline"
							disabled={testMutation.isPending}
							onClick={handleTest}
						>
							Test connection
						</Button>
					</Field>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
