import { revalidateLogic } from "@tanstack/react-form";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field } from "#/components/ui/field";
import { useWebhooks } from "#/features/webhooks/hooks/use-webhooks";
import {
	AddWebhookFormSchema,
	addWebhookDefaults,
	toCreateWebhookInput,
	WEBHOOK_EVENT_OPTIONS,
} from "#/features/webhooks/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

type AddWebhookFormProps = { onSuccess?: () => void };

export function AddWebhookForm({ onSuccess }: AddWebhookFormProps) {
	const { createWebhook } = useWebhooks();

	const form = useAppForm({
		defaultValues: addWebhookDefaults,
		validators: { onDynamic: AddWebhookFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createWebhook.mutate(toCreateWebhookInput(value), {
				onSuccess: () => {
					formApi.reset();
					onSuccess?.();
				},
			});
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>New webhook</CardTitle>
			</CardHeader>
			<CardContent>
				<form.AppForm>
					<form.SubmitForm className="gap-3">
						<form.AppField name="name">
							{(field) => <field.InputField label="Name" placeholder="My webhook" />}
						</form.AppField>
						<form.AppField name="url">
							{(field) => <field.InputField label="URL" placeholder="https://example.com/hook" />}
						</form.AppField>
						<form.AppField name="secret">
							{(field) => <field.PasswordField label="Signing secret (optional)" />}
						</form.AppField>
						<form.AppField name="events">
							{(field) => <field.MultiToggleField label="Events" options={WEBHOOK_EVENT_OPTIONS} />}
						</form.AppField>
						<form.FormError>{createWebhook.error?.message}</form.FormError>
						<Field orientation="horizontal">
							<form.SubmitButton size="sm">Create</form.SubmitButton>
						</Field>
					</form.SubmitForm>
				</form.AppForm>
			</CardContent>
		</Card>
	);
}
