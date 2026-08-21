import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signInDefaults, signInSchema } from "#/shared/domain/auth/schemas";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { authClient } from "#/shared/lib/auth-client";

export function SignInForm() {
	const navigate = useNavigate();
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: signInDefaults,
		validators: { onDynamic: signInSchema },
		onSubmit: async ({ value }) => {
			setErrorMsg(null);

			await authClient.signIn.email(value, {
				onError: () => setErrorMsg("Invalid credentials."),
				onSuccess: async () => navigate({ to: "/" }),
			});
		},
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

				<form.SubmitButton>Sign in</form.SubmitButton>
				<form.FormError>{errorMsg}</form.FormError>
			</form.SubmitForm>
		</form.AppForm>
	);
}
