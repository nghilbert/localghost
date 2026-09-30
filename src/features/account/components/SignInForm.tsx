import { useAppForm } from "#/components/form/use-app-form";
import { signInDefaults, signInSchema } from "#/features/account/account.schemas";
import { useSignIn } from "#/features/account/hooks/use-sign-in";

/** The email and password sign-in form. */
export function SignInForm() {
	const signIn = useSignIn();

	const form = useAppForm({
		defaultValues: signInDefaults,
		validators: { onDynamic: signInSchema },
		onSubmit: ({ value }) => signIn.mutateAsync(value),
	});

	return (
		<form.AppForm>
			<form.Form>
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

				<form.SubmitButton>Sign in</form.SubmitButton>
				<form.FormError>{signIn.error?.message}</form.FormError>
			</form.Form>
		</form.AppForm>
	);
}
