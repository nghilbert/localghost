import { revalidateLogic } from "@tanstack/react-form";
import { FieldGroup } from "#/components/ui/field";
import { useSendEmail } from "#/features/email/hooks/use-send-email";
import {
	ComposeEmailFormSchema,
	composeEmailDefaults,
	toSendEmailInput,
} from "#/features/email/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

type ComposeEmailFormProps = {
	accountId: string;
	replyTo?: { to: string; subject: string };
	onSuccess?: () => void;
};

export function ComposeEmailForm({ accountId, replyTo, onSuccess }: ComposeEmailFormProps) {
	const sendMutation = useSendEmail();

	const form = useAppForm({
		defaultValues: composeEmailDefaults(replyTo),
		validators: { onDynamic: ComposeEmailFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await sendMutation.mutate(toSendEmailInput(accountId, value), {
				onSuccess: () => {
					formApi.reset();
					onSuccess?.();
				},
			});
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.AppForm>
				<FieldGroup className="gap-3">
					<form.AppField name="to">
						{(field) => <field.InputField label="To" placeholder="someone@example.com" />}
					</form.AppField>
					<form.AppField name="subject">
						{(field) => <field.InputField label="Subject" />}
					</form.AppField>
					<form.AppField name="body">
						{(field) => (
							<field.TextareaField
								label="Message"
								placeholder="Write your message…"
								rows={12}
								className="resize-y"
							/>
						)}
					</form.AppField>
					<form.FormError>{sendMutation.error?.message}</form.FormError>
					<form.SubmitButton>Send</form.SubmitButton>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
