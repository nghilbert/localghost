import { useSignUp } from "#/routes/_public/-hooks/use-sign-up";
import { signUpDefaults, signUpFormSchema } from "#/shared/domain/auth/schemas";
import { useAppForm } from "#/shared/hooks/use-app-form";

export function SignUpForm() {
	const signUp = useSignUp();

	const form = useAppForm({
		defaultValues: signUpDefaults,
		validators: { onDynamic: signUpFormSchema },
		// `confirmPassword` is a form-only field; better-auth takes the credentials alone.
		onSubmit: ({ value: { name, email, password } }) =>
			signUp.mutateAsync({ name, email, password }),
	});

	return (
		<form.AppForm>
			<form.SubmitForm>
				<form.AppField name="name">
					{(field) => (
						<field.InputField
							label="Name"
							type="text"
							autoComplete="name"
							placeholder="Your name"
						/>
					)}
				</form.AppField>

				<form.AppField name="email">
					{(field) => (
						<field.InputField
							label="Email"
							type="email"
							autoComplete="email"
							placeholder="email@example.com"
						/>
					)}
				</form.AppField>

				<form.AppField name="password">
					{(field) => <field.PasswordField label="Password" autoComplete="new-password" />}
				</form.AppField>

				<form.AppField name="confirmPassword">
					{(field) => <field.PasswordField label="Confirm password" autoComplete="new-password" />}
				</form.AppField>

				<form.SubmitButton data-testid="sign-up-submit">Sign up</form.SubmitButton>
				<form.FormError>{signUp.error?.message}</form.FormError>
			</form.SubmitForm>
		</form.AppForm>
	);
}
