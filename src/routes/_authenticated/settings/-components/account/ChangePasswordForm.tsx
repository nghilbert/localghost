import { useChangePassword } from "#/routes/_authenticated/settings/-hooks/use-change-password";
import { changePasswordFormSchema } from "#/routes/_authenticated/settings/-lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "#/shared/components/ui/card";
import { useAppForm } from "#/shared/hooks/use-app-form";

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
		<Card>
			<CardHeader>
				<CardTitle>Security</CardTitle>
			</CardHeader>
			<CardContent>
				<form.AppForm>
					<form.SubmitForm className="gap-3">
						<form.AppField name="currentPassword">
							{(field) => <field.PasswordField label="Current password" />}
						</form.AppField>

						<form.AppField name="newPassword">
							{(field) => <field.PasswordField label="New password" />}
						</form.AppField>

						<form.AppField name="confirmPassword">
							{(field) => <field.PasswordField label="Confirm new password" />}
						</form.AppField>

						<form.SubmitButton size="sm" data-testid="change-password-submit">
							Change password
						</form.SubmitButton>
					</form.SubmitForm>
				</form.AppForm>
			</CardContent>
		</Card>
	);
}
