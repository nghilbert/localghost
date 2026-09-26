import type { ReactNode } from "react";
import { AdvancedSection } from "#/components/form/AdvancedSection";
import { useAppForm } from "#/components/form/use-app-form";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/toast";
import { useTestEndpoint } from "#/features/endpoint/hooks/use-test-endpoint";
import type { buildEndpointFormSchema } from "#/features/endpoint/lib/providers";
import type { LLMProvider } from "#/lib/llm-provider";

/** The trimmed values of a submitted endpoint form. */
type EndpointFormValues = { name: string; url: string; apiKey: string };

type ProviderEndpointFormProps = {
	schema: ReturnType<typeof buildEndpointFormSchema>;
	/** The provider, so "Test connection" sends its kind of key. */
	provider: LLMProvider;
	defaultValues: EndpointFormValues;
	keyLabel: string;
	keyPlaceholder?: string;
	keyDescription: string;
	urlPlaceholder: string;
	/** Hides the URL under "Advanced". */
	collapseUrl: boolean;
	submitIcon: ReactNode;
	submitLabel: string;
	/** Shows a Cancel button. */
	onCancel?: () => void;
	/** Call `onSaved` after saving, to reset the form and test result. */
	onSubmit: (args: { value: EndpointFormValues; onSaved: () => void }) => Promise<unknown>;
};

/** An endpoint's name, URL, and key fields, with "Test connection". */
export function ProviderEndpointForm({
	schema,
	provider,
	defaultValues,
	keyLabel,
	keyPlaceholder,
	keyDescription,
	urlPlaceholder,
	collapseUrl,
	submitIcon,
	submitLabel,
	onCancel,
	onSubmit,
}: ProviderEndpointFormProps) {
	const testEndpoint = useTestEndpoint();

	const form = useAppForm({
		defaultValues,
		validators: { onDynamic: schema },
		onSubmit: ({ value, formApi }) =>
			onSubmit({
				value: { name: value.name.trim(), url: value.url.trim(), apiKey: value.apiKey },
				onSaved: () => {
					formApi.reset();
					testEndpoint.reset();
				},
			}),
	});

	function handleTest() {
		const parsed = schema.safeParse(form.state.values);
		if (!parsed.success) {
			form.validateAllFields("submit");
			return;
		}
		testEndpoint.reset();
		testEndpoint.mutate(
			{ url: parsed.data.url.trim(), apiKey: parsed.data.apiKey || undefined, provider },
			{
				onSuccess: (result) => {
					if (result.ok) {
						toast.add({
							title:
								result.modelCount != null
									? `Connection works: ${result.modelCount} models available`
									: "Connection works",
							type: "success",
						});
					}
				},
			},
		);
	}

	const urlField = (
		<form.AppField name="url">
			{(field) => <field.InputField label="Base URL" placeholder={urlPlaceholder} />}
		</form.AppField>
	);

	return (
		<form.AppForm>
			<form.Form className="gap-3">
				<form.AppField name="name">{(field) => <field.InputField label="Name" />}</form.AppField>

				<form.AppField name="apiKey">
					{(field) => (
						<field.PasswordField
							label={keyLabel}
							placeholder={keyPlaceholder ?? "sk-..."}
							description={keyDescription}
						/>
					)}
				</form.AppField>

				{collapseUrl ? <AdvancedSection>{urlField}</AdvancedSection> : urlField}

				<form.FormError>
					{testEndpoint.data && !testEndpoint.data.ok ? testEndpoint.data.error : undefined}
				</form.FormError>

				<div className="flex items-center gap-3">
					<form.SubmitButton>
						{submitIcon}
						{submitLabel}
					</form.SubmitButton>
					<Button
						type="button"
						color="neutral"
						variant="outlined"
						disabled={testEndpoint.isPending}
						onClick={handleTest}
					>
						Test connection
					</Button>
					{onCancel && (
						<Button type="button" color="neutral" variant="quiet" onClick={onCancel}>
							Cancel
						</Button>
					)}
				</div>
			</form.Form>
		</form.AppForm>
	);
}
