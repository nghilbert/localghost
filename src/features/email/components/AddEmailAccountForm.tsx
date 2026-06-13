import { revalidateLogic } from "@tanstack/react-form";
import { FieldGroup, FieldLegend, FieldSet } from "#/components/ui/field";
import { useCreateEmailAccount } from "#/features/email/hooks/use-create-email-account";
import {
	EmailAccountFormSchema,
	emailAccountDefaults,
	toCreateEmailAccountInput,
} from "#/features/email/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

const SMTP_SECURITY_OPTIONS = [
	{ value: "ssl", label: "SSL/TLS" },
	{ value: "starttls", label: "STARTTLS" },
	{ value: "none", label: "None" },
];

type AddEmailAccountFormProps = { onSuccess?: (id: string) => void };

export function AddEmailAccountForm({ onSuccess }: AddEmailAccountFormProps) {
	const createMutation = useCreateEmailAccount();

	const form = useAppForm({
		defaultValues: emailAccountDefaults,
		validators: { onDynamic: EmailAccountFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createMutation.mutate(toCreateEmailAccountInput(value), {
				onSuccess: (account) => {
					formApi.reset();
					onSuccess?.(account.id);
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
				<FieldGroup className="gap-4">
					<div className="grid grid-cols-2 gap-3">
						<form.AppField name="name">
							{(field) => <field.InputField label="Account name" />}
						</form.AppField>
						<form.AppField name="fromAddress">
							{(field) => <field.InputField label="From address" />}
						</form.AppField>
					</div>
					<FieldSet>
						<FieldLegend>IMAP (incoming)</FieldLegend>
						<div className="grid grid-cols-2 gap-3">
							<form.AppField name="imapHost">
								{(field) => <field.InputField label="Host" />}
							</form.AppField>
							<form.AppField name="imapPort">
								{(field) => <field.InputField label="Port" inputMode="numeric" />}
							</form.AppField>
							<form.AppField name="imapUser">
								{(field) => <field.InputField label="Username" />}
							</form.AppField>
							<form.AppField name="imapPassword">
								{(field) => <field.PasswordField label="Password" />}
							</form.AppField>
						</div>
					</FieldSet>
					<FieldSet>
						<FieldLegend>SMTP (outgoing)</FieldLegend>
						<div className="grid grid-cols-2 gap-3">
							<form.AppField name="smtpHost">
								{(field) => <field.InputField label="Host" />}
							</form.AppField>
							<form.AppField name="smtpPort">
								{(field) => <field.InputField label="Port" inputMode="numeric" />}
							</form.AppField>
							<form.AppField name="smtpSecurity">
								{(field) => <field.SelectField label="Security" options={SMTP_SECURITY_OPTIONS} />}
							</form.AppField>
							<form.AppField name="smtpUser">
								{(field) => <field.InputField label="Username (blank = same as IMAP)" />}
							</form.AppField>
							<form.AppField name="smtpPassword">
								{(field) => <field.PasswordField label="Password (blank = same as IMAP)" />}
							</form.AppField>
						</div>
					</FieldSet>
					<form.FormError>{createMutation.error?.message}</form.FormError>
					<form.SubmitButton>Add Account</form.SubmitButton>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
