import { useAppForm } from "#/components/form/use-app-form";
import { Card } from "#/components/ui/card";
import { changePasswordFormSchema } from "#/features/account/account.schemas";
import { useChangePassword } from "#/features/account/hooks/use-change-password";

/** Changes the user's password and clears the form after success. */
export function ChangePasswordForm() {
	const changePassword = useChangePassword();
	const form = useAppForm({
		defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
		validators: { onDynamic: changePasswordFormSchema },
		onSubmit: ({ value }) =>
			changePassword.mutateAsync(
				{ currentPassword: value.currentPassword, newPassword: value.newPassword },
				{ onSuccess: () => form.reset() },
			),
	});

	return (
		<Card.Root>
			<Card.Header>
				<Card.Title>Security</Card.Title>
			</Card.Header>
			<Card.Content>
				<form.AppForm>
					<form.Form className="gap-3">
						<form.AppField name="currentPassword">
							{(field) => <field.PasswordField label="Current password" />}
						</form.AppField>

						<form.AppField name="newPassword">
							{(field) => <field.PasswordField label="New password" />}
						</form.AppField>

						<form.AppField name="confirmPassword">
							{(field) => <field.PasswordField label="Confirm new password" />}
						</form.AppField>

						<form.SubmitButton size="sm">Change password</form.SubmitButton>
					</form.Form>
				</form.AppForm>
			</Card.Content>
		</Card.Root>
	);
}
