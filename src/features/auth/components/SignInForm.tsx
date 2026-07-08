import { revalidateLogic } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { authClient } from "#/shared/lib/auth-client";
import { FieldError } from "#/shared/ui/field";
import { signInDefaults, signInSchema } from "../lib/schemas";

export function SignInForm() {
	const navigate = useNavigate();
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: signInDefaults,
		validators: { onDynamic: signInSchema },
		validationLogic: revalidateLogic(),
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
				<FieldError>{errorMsg}</FieldError>
			</form.SubmitForm>
		</form.AppForm>
	);
}
