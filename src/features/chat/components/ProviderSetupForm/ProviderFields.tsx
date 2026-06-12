import { revalidateLogic } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, ChevronDownIcon, CircleAlertIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Field, FieldError, FieldGroup } from "#/components/ui/field";
import { createEndpoint, testEndpoint } from "#/features/chat/lib/chat.functions";
import {
	buildEndpointFormSchema,
	dbProviderFor,
	type ProviderDefinition,
} from "#/features/chat/lib/providers";
import { useAppForm } from "#/hooks/use-app-form";

type ProviderFieldsProps = {
	definition: ProviderDefinition;
	onCreated?: () => void;
};

export function ProviderFields({ definition, onCreated }: ProviderFieldsProps) {
	const queryClient = useQueryClient();
	const schema = buildEndpointFormSchema(definition);

	const testMutation = useMutation({
		mutationFn: (data: { url: string; apiKey?: string }) => testEndpoint({ data }),
	});

	const createMutation = useMutation({
		mutationFn: (data: { name: string; url: string; apiKey?: string }) =>
			createEndpoint({
				data: { ...data, provider: dbProviderFor(definition.id) },
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
			toast.success(`${definition.label} added`);
			onCreated?.();
		},
		onError: (error) => toast.error("Failed to add provider", { description: error.message }),
	});

	const form = useAppForm({
		defaultValues: {
			name: definition.defaultName,
			url: definition.defaultBaseUrl ?? "",
			apiKey: "",
		},
		validators: { onDynamic: schema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createMutation.mutateAsync({
				name: value.name.trim(),
				url: value.url.trim(),
				apiKey: value.apiKey || undefined,
			});
			formApi.reset();
		},
	});

	function handleTest() {
		const parsed = schema.safeParse(form.state.values);
		if (!parsed.success) return;
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
			{(field) => <field.InputField label="Base URL" placeholder="https://my-server:8000/v1" />}
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
						<Alert variant={testMutation.data.ok ? "default" : "destructive"}>
							{testMutation.data.ok ? (
								<CheckCircle2Icon className="text-success" />
							) : (
								<CircleAlertIcon />
							)}
							<AlertTitle>
								{testMutation.data.ok ? "Connection works" : "Connection failed"}
							</AlertTitle>
							<AlertDescription>
								{testMutation.data.ok
									? `${testMutation.data.modelCount} models available.`
									: testMutation.data.error}
							</AlertDescription>
						</Alert>
					)}
					<FieldError>{createMutation.error?.message}</FieldError>

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
