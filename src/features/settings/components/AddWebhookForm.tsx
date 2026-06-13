import { revalidateLogic } from "@tanstack/react-form";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldGroup } from "#/components/ui/field";
import { useCreateWebhook } from "#/features/webhooks/hooks/use-create-webhook";
import {
	AddWebhookFormSchema,
	addWebhookDefaults,
	toCreateWebhookInput,
	WEBHOOK_EVENT_OPTIONS,
} from "#/features/webhooks/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

type AddWebhookFormProps = { onSuccess?: () => void };

export function AddWebhookForm({ onSuccess }: AddWebhookFormProps) {
	const createMutation = useCreateWebhook();

	const form = useAppForm({
		defaultValues: addWebhookDefaults,
		validators: { onDynamic: AddWebhookFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createMutation.mutate(toCreateWebhookInput(value), {
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
				<form
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<FieldGroup className="gap-3">
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
								{(field) => (
									<field.MultiToggleField label="Events" options={WEBHOOK_EVENT_OPTIONS} />
								)}
							</form.AppField>
							<form.FormError>{createMutation.error?.message}</form.FormError>
							<Field orientation="horizontal">
								<form.SubmitButton size="sm">Create</form.SubmitButton>
							</Field>
						</FieldGroup>
					</form.AppForm>
				</form>
			</CardContent>
		</Card>
	);
}
