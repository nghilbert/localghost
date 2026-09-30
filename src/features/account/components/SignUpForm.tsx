import {
	PasswordConfirmGroup,
	passwordConfirmFields,
} from "#/components/form/field-groups/PasswordConfirmGroup";
import { useAppForm } from "#/components/form/use-app-form";
import { signUpDefaults, signUpFormSchema } from "#/features/account/account.schemas";
import { useSignUp } from "#/features/account/hooks/use-sign-up";

/** The form that creates an account. */
export function SignUpForm() {
	const signUp = useSignUp();

	const form = useAppForm({
		defaultValues: signUpDefaults,
		validators: { onDynamic: signUpFormSchema },
		onSubmit: ({ value: { name, email, password } }) =>
			signUp.mutateAsync({ name, email, password }),
	});

	return (
		<form.AppForm>
			<form.Form>
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

				<PasswordConfirmGroup form={form} fields={passwordConfirmFields} />

				<form.SubmitButton>Sign up</form.SubmitButton>
				<form.FormError>{signUp.error?.message}</form.FormError>
			</form.Form>
		</form.AppForm>
	);
}
