import { revalidateLogic } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FieldError, FieldGroup, FieldSet } from "#/components/ui/field";
import { authClient } from "#/features/auth/lib/auth-client";
import { useAppForm } from "#/hooks/use-app-form";
import { SignInDefaults, SignInSchema } from "../lib/schemas";

export function SignInForm() {
	const navigate = useNavigate();
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: SignInDefaults,
		validators: { onDynamic: SignInSchema },
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
		<form
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.AppForm>
				<FieldSet>
					<FieldGroup>
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
					</FieldGroup>
				</FieldSet>
			</form.AppForm>
		</form>
	);
}
