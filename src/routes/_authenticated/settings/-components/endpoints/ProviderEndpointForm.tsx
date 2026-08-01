import { revalidateLogic } from "@tanstack/react-form";
import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import type {
	buildEndpointFormSchema,
	DbProvider,
} from "#/routes/_authenticated/settings/-lib/providers";
import { Button } from "#/shared/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/shared/components/ui/collapsible";
import { Field } from "#/shared/components/ui/field";
import { toast } from "#/shared/components/ui/toast";
import { useEndpoints } from "#/shared/domain/endpoint/use-endpoints";
import { useAppForm } from "#/shared/hooks/use-app-form";

/** The trimmed values a provider-endpoint submission produces. */
export type EndpointFormValues = { name: string; url: string; apiKey: string };

type ProviderEndpointFormProps = {
	schema: ReturnType<typeof buildEndpointFormSchema>;
	/** The provider family being configured, so "Test connection" probes with its auth scheme. */
	provider: DbProvider;
	defaultValues: EndpointFormValues;
	keyLabel: string;
	keyPlaceholder?: string;
	keyDescription: string;
	urlPlaceholder: string;
	/** Hide the URL behind an "Advanced" collapsible; false keeps it always visible. */
	collapseUrl: boolean;
	submitIcon: ReactNode;
	submitLabel: string;
	/** Renders a Cancel button in the action row when the form can be dismissed (edit). */
	onCancel?: () => void;
	/** `onSaved` resets the form and the test result; call it from the mutation's success. */
	onSubmit: (args: { value: EndpointFormValues; onSaved: () => void }) => Promise<void>;
};

/**
 * The shared name/URL/API-key form for a provider endpoint, with a "Test
 * connection" affordance. Composed by both the add flow and the inline edit.
 */
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
	const { testEndpoint } = useEndpoints();

	const form = useAppForm({
		defaultValues,
		validators: { onDynamic: schema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await onSubmit({
				value: { name: value.name.trim(), url: value.url.trim(), apiKey: value.apiKey },
				onSaved: () => {
					formApi.reset();
					testEndpoint.reset();
				},
			});
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
			<form.SubmitForm className="gap-3">
				<form.AppField name="name">{(field) => <field.InputField label="Name" />}</form.AppField>

				<form.AppField name="apiKey">
					{(field) => (
						<field.PasswordField
							label={keyLabel}
							placeholder={keyPlaceholder ?? "sk-…"}
							description={keyDescription}
						/>
					)}
				</form.AppField>

				{collapseUrl ? (
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
				) : (
					urlField
				)}

				<form.FormError>
					{testEndpoint.data && !testEndpoint.data.ok ? testEndpoint.data.error : undefined}
				</form.FormError>

				<Field orientation="horizontal">
					<form.SubmitButton>
						{submitIcon}
						{submitLabel}
					</form.SubmitButton>
					<Button
						type="button"
						variant="outline"
						disabled={testEndpoint.isPending}
						onClick={handleTest}
					>
						Test connection
					</Button>
					{onCancel && (
						<Button type="button" variant="ghost" onClick={onCancel}>
							Cancel
						</Button>
					)}
				</Field>
			</form.SubmitForm>
		</form.AppForm>
	);
}
