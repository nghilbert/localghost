import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { FieldError, FieldGroup } from "#/components/ui/field";
import { createWebhook } from "#/features/webhooks/lib/webhook.functions";
import { useAppForm } from "#/hooks/use-app-form";

const WEBHOOK_EVENT_OPTIONS = [
	{ value: "chat.completed", label: "chat.completed" },
	{ value: "session.created", label: "session.created" },
	{ value: "chat.message", label: "chat.message" },
];

const WebhookSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(100),
	url: z.url("Must be a valid URL").max(2048),
	secret: z.string(),
	events: z.array(z.string()).min(1, "Pick at least one event"),
});

const WebhookDefaults: z.infer<typeof WebhookSchema> = {
	name: "",
	url: "",
	secret: "",
	events: ["chat.completed"],
};

type WebhookAddFormProps = {
	onCreated: () => void;
};

export function WebhookAddForm({ onCreated }: WebhookAddFormProps) {
	const queryClient = useQueryClient();
	const [formError, setFormError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: WebhookDefaults,
		validators: { onDynamic: WebhookSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				await createWebhook({
					data: {
						name: value.name.trim(),
						url: value.url.trim(),
						events: value.events,
						secret: value.secret || undefined,
					},
				});
				queryClient.invalidateQueries({ queryKey: ["webhooks"] });
				toast.success("Webhook created");
				formApi.reset();
				onCreated();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to create webhook");
			}
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
							<FieldError>{formError}</FieldError>
							<form.SubmitButton size="sm" className="w-fit">
								Create
							</form.SubmitButton>
						</FieldGroup>
					</form.AppForm>
				</form>
			</CardContent>
		</Card>
	);
}
