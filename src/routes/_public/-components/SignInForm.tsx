import { useSignIn } from "#/routes/_public/-hooks/use-sign-in";
import { signInDefaults, signInSchema } from "#/shared/domain/auth/schemas";
import { useAppForm } from "#/shared/hooks/use-app-form";

export function SignInForm() {
	const signIn = useSignIn();

	const form = useAppForm({
		defaultValues: signInDefaults,
		validators: { onDynamic: signInSchema },
		onSubmit: ({ value }) => signIn.mutateAsync(value),
	});

	return (
		<form.AppForm>
			<form.SubmitForm>
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
					{(field) => <field.PasswordField label="Password" autoComplete="current-password" />}
				</form.AppField>

				<form.SubmitButton data-testid="sign-in-submit">Sign in</form.SubmitButton>
				<form.FormError>{signIn.error?.message}</form.FormError>
			</form.SubmitForm>
		</form.AppForm>
	);
}
