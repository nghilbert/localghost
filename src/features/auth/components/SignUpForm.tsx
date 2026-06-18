import { revalidateLogic } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FieldError } from "#/components/ui/field";
import { authClient } from "#/features/auth/lib/auth-client";
import { useAppForm } from "#/hooks/use-app-form";
import { SignUpDefaults, SignUpSchema } from "../lib/schemas";

export function SignUpForm() {
	const navigate = useNavigate();
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: SignUpDefaults,
		validators: { onDynamic: SignUpSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			setErrorMsg(null);

			await authClient.signUp.email(value, {
				onError: ({ error }) => setErrorMsg(error.message ?? "Sign up failed. Please try again."),
				onSuccess: async () => navigate({ to: "/" }),
			});
		},
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

				<form.SubmitButton>Sign up</form.SubmitButton>
				<FieldError>{errorMsg}</FieldError>
			</form.SubmitForm>
		</form.AppForm>
	);
}
